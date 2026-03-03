import os
import json
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

#  Tools
@tool
def get_patient_info(patient_id: str) -> str:
    """Get patient medical history, allergies, and current medications."""
    patient = db.get_patient(patient_id)
    if patient:
        return json.dumps(patient)
    return "Patient not found"

@tool
def check_drug_interaction_tool(drug1: str, drug2: str) -> str:
    """Check for potential interactions between two drugs."""
    known_interactions = {
        ("warfarin", "aspirin"): "HIGH RISK: Increased bleeding risk",
        ("metformin", "alcohol"): "MODERATE: Risk of lactic acidosis",
        ("lisinopril", "potassium"): "MODERATE: Hyperkalemia risk",
        ("ssri", "maoi"): "CRITICAL: Serotonin syndrome risk",
        ("ciprofloxacin", "antacid"): "LOW: Reduced absorption",
    }
    d1, d2 = drug1.lower(), drug2.lower()
    for (k1, k2), v in known_interactions.items():
        if (k1 in d1 and k2 in d2) or (k2 in d1 and k1 in d2):
            return v
    return f"No known critical interactions between {drug1} and {drug2}"

@tool
def get_medicine_info(medicine_name: str) -> str:
    """Get information about a medicine including dosage, side effects, and stock."""
    medicines = db.get_all_medicines()
    for med in medicines:
        if medicine_name.lower() in med["name"].lower():
            return json.dumps(med)
    # Return general info from knowledge base
    info = {
        "name": medicine_name,
        "general_info": f"General pharmacological information for {medicine_name}",
        "note": "Consult a licensed physician for specific dosage recommendations"
    }
    return json.dumps(info)

@tool
def check_inventory(medicine_name: str) -> str:
    """Check inventory levels for a specific medicine."""
    medicines = db.get_all_medicines()
    for med in medicines:
        if medicine_name.lower() in med["name"].lower():
            status = "LOW STOCK" if med["stock"] < med["min_stock"] else "ADEQUATE"
            return f"{med['name']}: {med['stock']} units ({status})"
    return f"{medicine_name} not found in inventory"

@tool
def schedule_appointment(patient_id: str, doctor: str, date: str, reason: str) -> str:
    """Schedule a medical appointment for a patient."""
    appointment = db.create_appointment({
        "patient_id": patient_id,
        "doctor": doctor,
        "date": date,
        "reason": reason,
        "status": "scheduled"
    })
    return f"Appointment scheduled successfully. ID: {appointment['id']}"

@tool
def get_symptom_analysis(symptoms: str) -> str:
    """Analyze symptoms and suggest possible conditions (NOT a diagnosis)."""
    return f"""Symptom analysis for: {symptoms}
    
    IMPORTANT DISCLAIMER: This is NOT a medical diagnosis. 
    Always consult a qualified healthcare professional.
    
    General guidance: Based on described symptoms, please seek immediate medical attention 
    if you experience severe chest pain, difficulty breathing, or loss of consciousness.
    For non-emergency symptoms, schedule an appointment with your doctor."""

tools = [
    get_patient_info,
    check_drug_interaction_tool,
    get_medicine_info,
    check_inventory,
    schedule_appointment,
    get_symptom_analysis
]

SYSTEM_PROMPT = """You are MediAssist AI an intelligent medical assistant agent for a Smart Healthcare Management System.

You have access to:
- Patient records and medical history
- Drug interaction database
- Medicine inventory system
- Appointment scheduling
- Symptom analysis (non-diagnostic)

Your responsibilities:
1.  Answer medical queries professionally with appropriate disclaimers
2.  Check drug interactions and prescription safety
3.  Monitor medicine inventory and alert on low stock
4.  Schedule and manage appointments
5.  Retrieve and summarize patient information
6.  Always recommend consulting a licensed physician for diagnosis

Guidelines:
- Always include medical disclaimers for health advice
- Never provide definitive diagnoses
- Flag any dangerous drug interactions immediately
- Be empathetic and professional
- Format responses clearly with relevant emojis

Current system context: Smart Medical AI Agent v1.0"""

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
