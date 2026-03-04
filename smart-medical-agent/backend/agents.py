import os
import json
import httpx
from typing import Optional, TypedDict, Annotated
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from database import db
import operator

from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

#  Agent State
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    patient_id: Optional[str]
    session_id: str
    agent_type: str
    actions_taken: list
    data: dict
@tool
def check_drug_interaction_tool(drug1: str, drug2: str) -> str:
    """Check real drug interactions using OpenFDA external API."""
    try:
        url = f"https://api.fda.gov/drug/label.json?search=drug_interactions:{drug1}&limit=1"
        response = httpx.get(url, timeout=10)
        data = response.json()
        if "results" in data:
            interactions = data["results"][0].get("drug_interactions", [""])[0]
            if drug2.lower() in interactions.lower():
                return f" WARNING: {drug1} and {drug2} interaction found: {interactions[:300]}"
            return f" No critical interaction found between {drug1} and {drug2} in FDA database."
        return f"No FDA data found for {drug1}."
    except Exception as e:
        # Fallback to known interactions
        known = {
            ("warfarin", "aspirin"): " HIGH RISK: Increased bleeding risk",
            ("metformin", "alcohol"): " MODERATE: Risk of lactic acidosis",
            ("ssri", "maoi"): "🚨 CRITICAL: Serotonin syndrome risk",
        }
        d1, d2 = drug1.lower(), drug2.lower()
        for (k1, k2), v in known.items():
            if (k1 in d1 and k2 in d2) or (k2 in d1 and k1 in d2):
                return v
        return f" No known critical interactions between {drug1} and {drug2}"

#  Tool 2: RxNorm Medicine Info (REAL EXTERNAL API) 
@tool
def get_medicine_info(medicine_name: str) -> str:
    """Get real medicine information from RxNorm API."""
    try:
        # Step 1 - Get RxCUI code
        url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={medicine_name}&search=1"
        res = httpx.get(url, timeout=10)
        data = res.json()
        rxcui = data.get("idGroup", {}).get("rxnormId", [None])[0]
        if not rxcui:
            return f"Medicine '{medicine_name}' not found in RxNorm database."

        # Step 2 - Get properties
        url2 = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json"
        res2 = httpx.get(url2, timeout=10)
        props = res2.json().get("properties", {})

        name = props.get("name", medicine_name)
        synonym = props.get("synonym", "")
        drug_class = props.get("doseFormGroupName", "")

        return f"💊 {name} — {synonym}\nClass: {drug_class}\nRxCUI: {rxcui}\nSource: RxNorm (NIH)"
    except Exception:
        # Fallback to local DB
        medicines = db.get_all_medicines()
        for med in medicines:
            if medicine_name.lower() in med["name"].lower():
                return json.dumps(med)
        return f"Basic info: {medicine_name} is a commonly used medication. Consult physician for dosage."

#  Tool 3: OpenFDA Medicine Search (REAL EXTERNAL API)
@tool
def search_medicine_fda(medicine_name: str) -> str:
    """Search FDA database for medicine label, warnings and side effects."""
    try:
        url = f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{medicine_name}&limit=1"
        res = httpx.get(url, timeout=10)
        data = res.json()
        if "results" in data:
            result = data["results"][0]
            warnings = result.get("warnings", ["No warnings listed"])[0][:300]
            indications = result.get("indications_and_usage", ["Not available"])[0][:300]
            return f"💊 FDA Info for {medicine_name}:\n Use: {indications}\n⚠️ Warning: {warnings}"
        return f"No FDA label found for {medicine_name}"
    except Exception:
        return f"FDA API unavailable for {medicine_name}. Please consult a pharmacist."

#  Tool 4: Open Disease Symptom API (REAL EXTERNAL API) 
@tool
def get_symptom_analysis(symptoms: str) -> str:
    """Analyze symptoms using real medical API and suggest medicines from inventory."""
    try:
        # Use API Ninjas symptoms API
        url = "https://api.api-ninjas.com/v1/symptomchecker"
        headers = {"X-Api-Key": os.getenv("API_NINJAS_KEY", "")}
        res = httpx.get(url, params={"symptoms": symptoms}, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            conditions = [d.get("name", "") for d in data[:3]]
            result = f"🩺 Possible conditions: {', '.join(conditions)}"
        else:
            raise Exception("API unavailable")
    except Exception:
        # Smart fallback based on keywords
        symptom_map = {
            "headache": "Paracetamol 500mg or Ibuprofen. Rest and hydration recommended.",
            "fever": "Paracetamol 500mg to reduce temperature. Monitor closely.",
            "cold": "Rest, fluids, and Vitamin C. Antihistamines if congested.",
            "cough": "Cough syrup or lozenges. Steam inhalation helps.",
            "pain": "Paracetamol or Ibuprofen for pain relief.",
            "diabetes": "Monitor blood sugar. Metformin if prescribed.",
            "bp": "Lisinopril or Amlodipine. Reduce salt intake.",
            "anxiety": "Deep breathing exercises. Consult doctor for medication.",
        }
        s = symptoms.lower()
        for key, advice in symptom_map.items():
            if key in s:
                result = f"💊 For {symptoms}: {advice}"
                break
        else:
            result = f"For {symptoms} — please consult a licensed physician for proper diagnosis."

    # Always check inventory for relevant medicines
    medicines = db.get_all_medicines()
    available = [m["name"] for m in medicines if m["stock"] > 0]
    return f"{result}\n\n📦 Available in stock: {', '.join(available[:4])}\n Always consult a doctor before taking medication."

# Tool 5: Check Inventory (Internal but enhanced) 
@tool
def check_inventory(medicine_name: str) -> str:
    """Check inventory levels and get real-time stock status."""
    medicines = db.get_all_medicines()
    for med in medicines:
        if medicine_name.lower() in med["name"].lower():
            status = "🚨 OUT OF STOCK" if med["stock"] == 0 else "⚠️ LOW STOCK" if med["stock"] < med["min_stock"] else "✅ IN STOCK"
            return f"{med['name']}: {med['stock']} units — {status} | Price: ₹{med['price']}"
    return f"❌ {medicine_name} not found in inventory."

# ── Tool 6: Schedule Appointment 
@tool
def schedule_appointment(patient_id: str, doctor: str, date: str, reason: str) -> str:
    """Schedule a medical appointment."""
    appointment = db.create_appointment({
        "patient_id": patient_id,
        "doctor": doctor,
        "date": date,
        "reason": reason,
        "status": "scheduled"
    })
    return f" Appointment confirmed! ID: {appointment['id']} | {doctor} on {date} for {reason}"

# Tool 7: Get Patient Info 
@tool
def get_patient_info(patient_id: str) -> str:
    """Get patient medical history, allergies and current medications."""
    patient = db.get_patient(patient_id)
    if patient:
        return json.dumps(patient)
    return "Patient not found in records."

tools = [
    get_patient_info,
    check_drug_interaction_tool,
    get_medicine_info,
    search_medicine_fda,
    check_inventory,
    schedule_appointment,
    get_symptom_analysis,
]

SYSTEM_PROMPT = """You are MediAssist AI a smart pharmacy and medical assistant.

RESPONSE RULES (MOST IMPORTANT):
- Keep answers SHORT — 2 to 4 lines maximum
- NEVER show <function=...> or JSON or raw code in responses EVER
- Only answer what was asked nothing extra
- No long disclaimers every time add disclaimer ONLY if user asks for diagnosis

HOW TO HANDLE REQUESTS:
- "I have headache/fever/cold" → Suggest medicine from inventory + ask "Want to order it?"
- "I want 5 paracetamol" → Check stock → Reply: " 5x Paracetamol 500mg = ₹17.50. Confirm order?"
- "Book appointment" → Ask: which doctor and what date, then schedule it
- "Drug interaction X and Y" → Give one line answer on risk level
- "Patient info" → Show name, conditions, allergies only
- "Low stock" → List only medicines below minimum stock

TONE:
- Friendly, short, helpful like a real pharmacist
- Use 1 emoji max per response
- Never repeat yourself
- Never say "I cannot prescribe" instead say what you CAN do

You are a PHARMACY system helping users buy medicines, check stock, book appointments."""

# MedicalAgent Class
class MedicalAgent:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.1,
        )
        self.llm_with_tools = self.llm.bind_tools(tools)
        self.graph = self._build_graph()
        self.conversation_history = {}

    def _build_graph(self):
        tool_node = ToolNode(tools)

        def should_continue(state: AgentState):
            messages = state["messages"]
            last_message = messages[-1]
            if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                return "tools"
            return END

        def call_model(state: AgentState):
            messages = state["messages"]
            system = SystemMessage(content=SYSTEM_PROMPT)
            response = self.llm_with_tools.invoke([system] + messages)
            agent_type = "general"
            actions = state.get("actions_taken", [])
            if hasattr(response, "tool_calls") and response.tool_calls:
                for tc in response.tool_calls:
                    actions.append(f"Called tool: {tc['name']}")
                    if "drug" in tc["name"]:
                        agent_type = "pharmacist"
                    elif "patient" in tc["name"]:
                        agent_type = "records"
                    elif "inventory" in tc["name"] or "medicine" in tc["name"]:
                        agent_type = "inventory"
                    elif "appointment" in tc["name"]:
                        agent_type = "scheduler"
                    elif "symptom" in tc["name"]:
                        agent_type = "diagnostics"
            if hasattr(response, "content") and response.content:
               import re
               cleaned = response.content
               # Remove <function=...>...</function> tags
               cleaned = re.sub(r'<function=.*?</function>', '', cleaned, flags=re.DOTALL)
               # Remove raw JSON blobs like {"patient_id": "user"}
               cleaned = re.sub(r'\{\"[^}]*\}', '', cleaned, flags=re.DOTALL)
               # Remove leftover function= lines
               cleaned = re.sub(r'<function=\S+>', '', cleaned)
               # Clean up extra blank lines
               cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
               response.content = cleaned.strip()
            return {
                "messages": [response],
                "agent_type": agent_type,
                "actions_taken": actions
            }

        workflow = StateGraph(AgentState)
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", tool_node)
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges("agent", should_continue)
        workflow.add_edge("tools", "agent")
        return workflow.compile()

    async def process(self, message: str, patient_id: Optional[str], session_id: str):
        history = self.conversation_history.get(session_id, [])
        history.append(HumanMessage(content=message))

        initial_state = {
            "messages": history,
            "patient_id": patient_id,
            "session_id": session_id,
            "agent_type": "general",
            "actions_taken": [],
            "data": {}
        }

        result = self.graph.invoke(initial_state)
        ai_response = result["messages"][-1]
        response_text = ai_response.content if hasattr(ai_response, "content") else str(ai_response)

        history.append(AIMessage(content=response_text))
        if len(history) > 20:
            history = history[-20:]
        self.conversation_history[session_id] = history

        return {
            "response": response_text,
            "agent_type": result.get("agent_type", "general"),
            "actions_taken": result.get("actions_taken", []),
            "data": result.get("data", {})
        }

    async def validate_prescription(self, prescription: dict):
        drugs = prescription.get("medicines", [])
        warnings = []
        is_safe = True
        for i in range(len(drugs)):
            for j in range(i + 1, len(drugs)):
                interaction = check_drug_interaction_tool.invoke(
                    {"drug1": drugs[i], "drug2": drugs[j]}
                )
                if "HIGH RISK" in interaction or "CRITICAL" in interaction:
                    warnings.append(interaction)
                    is_safe = False
                elif "MODERATE" in interaction:
                    warnings.append(f"Warning: {interaction}")
        return {"is_safe": is_safe, "warnings": warnings}

    async def check_inventory_alerts(self):
        medicines = db.get_all_medicines()
        alerts = []
        for med in medicines:
            if med["stock"] < med["min_stock"]:
                severity = "critical" if med["stock"] == 0 else "warning"
                alerts.append({
                    "medicine": med["name"],
                    "current_stock": med["stock"],
                    "min_stock": med["min_stock"],
                    "severity": severity,
                    "message": f"{med['name']} is {'OUT OF STOCK' if med['stock'] == 0 else 'running low'}"
                })
        return {"alerts": alerts, "count": len(alerts)}

    async def check_drug_interactions(self, drug1: str, drug2: str):
        result = check_drug_interaction_tool.invoke({"drug1": drug1, "drug2": drug2})
        return {"drug1": drug1, "drug2": drug2, "interaction": result}
