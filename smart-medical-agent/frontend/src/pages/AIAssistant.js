import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatApi, getPatients } from '../utils/api';
import VoiceAgent from '../components/VoiceAgent';

const quickQuestions = [
  "Check drug interaction: Warfarin and Aspirin",
  "What are the low stock medicines?",
  "List all patients with diabetes",
  "Schedule appointment for P001 with Dr. Mehta tomorrow",
  "Analyze symptoms: fever, headache, fatigue",
  "Tell me about Metformin dosage",
];

const agentLabels = {
  general:     { label: 'General AI',        color: '#0ea5e9', icon: '🤖' },
  pharmacist:  { label: 'Pharmacist Agent',   color: '#10b981', icon: '💊' },
  records:     { label: 'Records Agent',      color: '#8b5cf6', icon: '📋' },
  inventory:   { label: 'Inventory Agent',    color: '#f59e0b', icon: '📦' },
  scheduler:   { label: 'Scheduler Agent',    color: '#06b6d4', icon: '📅' },
  diagnostics: { label: 'Diagnostics Agent',  color: '#ef4444', icon: '🩺' },
};

function useTTS() {
  const synth = useRef(window.speechSynthesis);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text) => {
    synth.current.cancel();
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/[•\-]\s/g, '')
      .substring(0, 600);

    const utter = new SpeechSynthesisUtterance(clean);
    utter.pitch = 1;
    utter.rate = 0.95;
    utter.volume = 1;

    const voices = synth.current.getVoices();
    const best = voices.find(v => v.name.includes('Google') || v.name.includes('Natural'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
    if (best) utter.voice = best;

    utter.onstart = () => setSpeaking(true);
    utter.onend   = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.current.speak(utter);
  }, []);

  const stop = useCallback(() => {
    synth.current.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const load = () => synth.current.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  return { speak, stop, speaking };
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: " Hello! I'm **MediAssist AI**, your intelligent medical assistant.\n\nEvery response I give will be read aloud automatically. You can mute anytime with the 🔇 button.\n\nI can help with:\n- 💊 Drug interaction checks\n- 📋 Patient records\n- 📦 Inventory monitoring\n- 📅 Appointment scheduling\n- 🩺 Symptom analysis",
      agentType: 'general',
      actions: [],
    }
  ]);
  const [input, setInput]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients]               = useState([]);
  const [showVoice, setShowVoice]             = useState(false);
  const [autoSpeak, setAutoSpeak]             = useState(true);
  const messagesEndRef                        = useRef(null);
  const { speak, stop, speaking }             = useTTS();

  useEffect(() => {
    getPatients().then(r => setPatients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    stop();
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await chatApi(msg, selectedPatient || null, 'main-session');
      const aiText  = res.data.response;
      const aiType  = res.data.agent_type || 'general';
      const actions = res.data.actions_taken || [];

      setMessages(prev => [...prev, {
        role: 'assistant', content: aiText, agentType: aiType, actions,
      }]);

      if (autoSpeak) speak(aiText);

    } catch {
      const errMsg = '⚠️ **Connection Error:** Could not reach the AI agent. Please ensure the backend server is running on port 8000.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, agentType: 'general', actions: [] }]);
      if (autoSpeak) speak('Connection error. Please ensure the backend server is running.');
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {showVoice && <VoiceAgent onClose={() => setShowVoice(false)} />}

      <div className="chat-layout">
        <div className="chat-container">

          {/* Header */}
          <div className="chat-header">
            <div className="chat-avatar">🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>MediAssist AI Agent</div>
              <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                LangGraph Multi-Agent · Groq LLaMA 3.3-70B
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {speaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                  Speaking...
                  <button onClick={stop} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 14, padding: 0 }}>⏹</button>
                </div>
              )}

              <button
                onClick={() => { setAutoSpeak(v => !v); if (speaking) stop(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: autoSpeak ? 'rgba(14,165,233,0.15)' : 'rgba(100,116,139,0.12)',
                  border: `1px solid ${autoSpeak ? 'rgba(14,165,233,0.4)' : 'rgba(100,116,139,0.25)'}`,
                  borderRadius: 10, color: autoSpeak ? '#38bdf8' : '#64748b',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
              >
                {autoSpeak ? '🔊' : '🔇'} {autoSpeak ? 'Voice On' : 'Voice Off'}
              </button>

              <button
                onClick={() => setShowVoice(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(16,185,129,0.2))',
                  border: '1px solid rgba(14,165,233,0.4)',
                  borderRadius: 10, color: '#38bdf8',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <span style={{ fontSize: 16 }}>🎙️</span> Voice Agent
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => {
              const agent = agentLabels[msg.agentType] || agentLabels.general;
              return (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-avatar"
                    style={{ background: msg.role === 'user' ? 'rgba(14,165,233,0.2)' : `${agent.color}20` }}>
                    {msg.role === 'user' ? '👤' : agent.icon}
                  </div>
                  <div style={{ maxWidth: '75%' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div className="agent-tag" style={{ color: agent.color, margin: 0 }}>{agent.label}</div>
                        <button
                          onClick={() => speak(msg.content)}
                          title="Read aloud"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#4a5568', padding: '0 4px' }}
                        >🔊</button>
                      </div>
                    )}
                    <div className="message-bubble" style={
                      msg.role === 'assistant'
                        ? { background: '#0f1e35', border: '1px solid rgba(56,189,248,0.12)', color: '#e2e8f0', borderBottomLeftRadius: 4 }
                        : { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', borderBottomRightRadius: 4 }
                    }>
                      {msg.role === 'assistant'
                        ? <ReactMarkdown components={{
                            p:      ({ children }) => <p style={{ marginBottom: 8, lineHeight: 1.6 }}>{children}</p>,
                            ul:     ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
                            li:     ({ children }) => <li style={{ marginBottom: 4, color: '#cbd5e1' }}>{children}</li>,
                            strong: ({ children }) => <strong style={{ color: '#38bdf8' }}>{children}</strong>,
                            code:   ({ children }) => <code style={{ background: '#0a1628', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'JetBrains Mono', color: '#10b981' }}>{children}</code>,
                          }}>{msg.content}</ReactMarkdown>
                        : msg.content
                      }
                    </div>
                    {msg.actions?.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {msg.actions.map((a, j) => (
                          <span key={j} style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 12, color: '#64748b' }}>
                            ⚙️ {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="message assistant">
                <div className="message-avatar" style={{ background: 'rgba(14,165,233,0.15)' }}>🤖</div>
                <div className="message-bubble" style={{ background: '#0f1e35', border: '1px solid rgba(56,189,248,0.12)' }}>
                  <div className="typing-indicator">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>Agent thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="chat-input-area">
            <div className="quick-questions">
              {quickQuestions.map((q, i) => (
                <button key={i} className="quick-btn" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
            <div className="chat-input-row">
              <textarea
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type or use 🎙️ to speak — AI replies in text + voice..."
                rows={1}
              />
              <button
                onClick={() => setShowVoice(true)}
                title="Open Voice Agent"
                style={{ width: 44, height: 44, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, color: '#0ea5e9', cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >🎙️</button>
              <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                {loading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Voice status card */}
          <div className="card card-sm" style={{ background: autoSpeak ? 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(16,185,129,0.06))' : 'var(--bg-card)', border: `1px solid ${autoSpeak ? 'rgba(14,165,233,0.25)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: autoSpeak ? 'rgba(14,165,233,0.15)' : 'rgba(100,116,139,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {speaking ? '🔊' : autoSpeak ? '🎵' : '🔇'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: autoSpeak ? '#38bdf8' : '#64748b' }}>
                  Auto Voice {autoSpeak ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontSize: 11, color: '#4a5568' }}>
                  {speaking ? 'Currently speaking...' : autoSpeak ? 'Every reply is read aloud' : 'Click to enable voice'}
                </div>
              </div>
            </div>
            {speaking
              ? <button onClick={stop} style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  ⏹ Stop Speaking
                </button>
              : <button onClick={() => setAutoSpeak(v => !v)} style={{ width: '100%', padding: '7px', background: autoSpeak ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.1)', border: `1px solid ${autoSpeak ? 'rgba(239,68,68,0.2)' : 'rgba(14,165,233,0.25)'}`, borderRadius: 8, color: autoSpeak ? '#ef4444' : '#38bdf8', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  {autoSpeak ? '🔇 Mute Voice' : '🔊 Enable Voice'}
                </button>
            }
          </div>

          {/* Voice Agent launch */}
          <div className="card card-sm" style={{ cursor: 'pointer' }} onClick={() => setShowVoice(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎙️</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>Voice Agent</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Fully hands-free mode</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>Tap the orb and speak. No typing needed.</p>
          </div>

          {/* Patient Context */}
          <div className="card card-sm">
            <div className="section-title" style={{ marginBottom: 12, fontSize: 14 }}>🔍 Patient Context</div>
            <div className="input-group">
              <label className="input-label">Select Patient</label>
              <select className="select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
                <option value="">No specific patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            {selectedPatient && (() => {
              const p = patients.find(pt => pt.id === selectedPatient);
              return p ? (
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(14,165,233,0.06)', borderRadius: 8, border: '1px solid rgba(14,165,233,0.12)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Age {p.age} · {p.blood_type} · {p.gender}</div>
                  {p.conditions?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.conditions.map((c, i) => <span key={i} className="badge badge-violet" style={{ fontSize: 10 }}>{c}</span>)}
                    </div>
                  )}
                  {p.allergies?.length > 0 && (
                    <div style={{ marginTop: 5 }}>
                      {p.allergies.map((a, i) => <span key={i} className="badge badge-red" style={{ fontSize: 10, marginRight: 4 }}>⚠️ {a}</span>)}
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>

          {/* Agent Capabilities */}
          <div className="card card-sm">
            <div className="section-title" style={{ marginBottom: 12, fontSize: 14 }}> Agents</div>
            {Object.entries(agentLabels).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${val.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{val.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: val.color }}>{val.label}</div>
                  <div style={{ width: 60, height: 3, background: `${val.color}30`, borderRadius: 2, marginTop: 3 }}>
                    <div style={{ width: '80%', height: '100%', background: val.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}