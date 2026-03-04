import { useState, useRef, useEffect, useCallback } from 'react';
import { chatApi } from '../utils/api';

const AGENT_VOICES = {
  general:     { pitch: 1.1,  rate: 1.2, name: 'general' },
  pharmacist:  { pitch: 1.0,  rate: 1.2, name: 'pharmacist' },
  records:     { pitch: 1.1,  rate: 1.2, name: 'records' },
  inventory:   { pitch: 1.0,  rate: 1.2, name: 'inventory' },
  scheduler:   { pitch: 1.1,  rate: 1.2, name: 'scheduler' },
  diagnostics: { pitch: 1.0,  rate: 1.2, name: 'diagnostics' },
};

export default function VoiceAgent({ onClose }) {
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [agentType, setAgentType] = useState('general');
  const [conversation, setConversation] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState('');
  const [pulseSize, setPulseSize] = useState(1);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);

  // Pulse animation during listening
  useEffect(() => {
    if (status === 'listening') {
      let t = 0;
      const animate = () => {
        t += 0.08;
        setPulseSize(1 + Math.sin(t) * 0.18);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      setPulseSize(1);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status]);

  // Init Speech Recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome.');
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (e) => {
      const current = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(current);
    };

    recognition.onend = () => {
      if (status === 'listening') {
        setStatus('thinking');
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone in browser settings.');
      } else if (e.error !== 'aborted') {
        setError(`Speech error: ${e.error}`);
      }
      setStatus('idle');
    };

    return recognition;
  }, [status]);

  const speak = useCallback((text, type = 'general') => {
    if (!voiceEnabled) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceConfig = AGENT_VOICES[type] || AGENT_VOICES.general;
    utterance.pitch = voiceConfig.pitch;
    utterance.rate = voiceConfig.rate;
    utterance.volume = 1;
    utterance.rate = 1.2;  
    utterance.pitch = 1.1;

    // Try to pick a good voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');
    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  const processVoiceInput = useCallback(async (text) => {
    if (!text.trim()) { setStatus('idle'); return; }
    setStatus('thinking');
    setConversation(prev => [...prev, { role: 'user', text }]);
    try {
      const res = await chatApi(text, null, 'voice-session');
      const aiText = res.data.response;
      const type = res.data.agent_type || 'general';
      // Strip markdown for speech
      const cleanText = aiText
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\n+/g, '. ')
        .replace(/[•\-]\s/g, '')
        .substring(0, 250); // Limit TTS length

      setResponse(aiText);
      setAgentType(type);
      setConversation(prev => [...prev, { role: 'assistant', text: aiText, type }]);
      speak(cleanText, type);
    } catch {
      const errMsg = 'Sorry, I could not connect to the medical AI. Please check your backend server.';
      setResponse(errMsg);
      speak(errMsg);
      setStatus('idle');
    }
  }, [speak]);

  const startListening = useCallback(() => {
    setError('');
    setTranscript('');
    synthRef.current.cancel();
    const recognition = initRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    recognition.onend = () => {
      const finalText = transcript || recognitionRef.current?._lastTranscript;
      if (finalText) processVoiceInput(finalText);
      else setStatus('idle');
    };

    // Capture transcript before onend fires
    recognition.onresult = (e) => {
      const current = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(current);
      recognitionRef.current._lastTranscript = current;
    };

    recognition.start();
  }, [initRecognition, transcript, processVoiceInput]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setStatus('idle');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synthRef.current.cancel();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const agentColors = {
    general: '#0ea5e9', pharmacist: '#10b981', records: '#8b5cf6',
    inventory: '#f59e0b', scheduler: '#06b6d4', diagnostics: '#ef4444'
  };
  const agentIcons = {
    general: '🤖', pharmacist: '💊', records: '📋',
    inventory: '📦', scheduler: '📅', diagnostics: '🩺'
  };
  const color = agentColors[agentType] || '#0ea5e9';

  const statusConfig = {
    idle: { label: 'Tap mic to speak', icon: '🎙️', color: '#64748b' },
    listening: { label: 'Listening...', icon: '👂', color: '#10b981' },
    thinking: { label: 'AI is thinking...', icon: '🧠', color: '#f59e0b' },
    speaking: { label: 'Speaking...', icon: '🔊', color: '#0ea5e9' },
  };
  const sc = statusConfig[status];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a1628',
        border: `1px solid ${color}40`,
        borderRadius: 24,
        width: 460,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: `0 0 60px ${color}20, 0 20px 60px rgba(0,0,0,0.6)`,
        animation: 'modalIn 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(56,189,248,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(14,165,233,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              border: `1px solid ${color}30`,
            }}>{agentIcons[agentType]}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Voice Medical Agent</div>
              <div style={{ fontSize: 12, color, marginTop: 1 }}>
                {agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent Active
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              style={{
                background: voiceEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                border: `1px solid ${voiceEnabled ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`,
                color: voiceEnabled ? '#10b981' : '#64748b',
                borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >{voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}</button>
            <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Orb */}
        <div style={{ padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Animated Orb */}
          <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer rings */}
            {status === 'listening' && [1.4, 1.6, 1.8].map((scale, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 100 * scale, height: 100 * scale,
                borderRadius: '50%',
                border: `1px solid ${color}`,
                opacity: 0.15 - i * 0.04,
                animation: `ripple ${1 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
            {status === 'speaking' && [1.3, 1.5].map((scale, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 100 * scale, height: 100 * scale,
                borderRadius: '50%',
                border: `1px solid ${color}`,
                opacity: 0.2,
                animation: `ripple ${0.8 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}

            {/* Main orb */}
            <button
              onClick={status === 'idle' ? startListening : status === 'listening' ? stopListening : status === 'speaking' ? stopSpeaking : undefined}
              disabled={status === 'thinking'}
              style={{
                width: 110 * pulseSize,
                height: 110 * pulseSize,
                borderRadius: '50%',
                background: status === 'thinking'
                  ? `conic-gradient(${color}, #8b5cf6, ${color})`
                  : `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`,
                border: `2px solid ${color}80`,
                cursor: status === 'thinking' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36,
                boxShadow: `0 0 40px ${color}40, 0 0 80px ${color}20`,
                transition: 'width 0.1s, height 0.1s',
                animation: status === 'thinking' ? 'spin 1.5s linear infinite' : 'none',
                outline: 'none',
              }}
            >
              {status === 'idle' && '🎙️'}
              {status === 'listening' && '⏹'}
              {status === 'thinking' && '⚕️'}
              {status === 'speaking' && '⏸'}
            </button>
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: sc.color }}>{sc.icon} {sc.label}</div>
            {transcript && status === 'listening' && (
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, fontStyle: 'italic', maxWidth: 300 }}>
                "{transcript}"
              </div>
            )}
          </div>

          {/* Quick voice commands */}
          {status === 'idle' && (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>
                Try saying...
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {[
                  'Check drug interaction Warfarin and Aspirin',
                  'Show low stock medicines',
                  'Patient info for P001',
                  'Analyze symptoms fever and headache',
                ].map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => processVoiceInput(cmd)}
                    style={{
                      padding: '5px 11px', borderRadius: 20,
                      border: '1px solid rgba(56,189,248,0.15)',
                      background: 'rgba(14,165,233,0.06)',
                      color: '#64748b', fontSize: 11, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.color = '#38bdf8'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'rgba(56,189,248,0.15)'; e.target.style.color = '#64748b'; }}
                  >{cmd}</button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', width: '100%', textAlign: 'center' }}>
             {error}
            </div>
          )}
        </div>

        {/* Conversation */}
        {conversation.length > 0 && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '0 20px 20px',
            borderTop: '1px solid rgba(56,189,248,0.08)',
            maxHeight: 220,
          }}>
            <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 0 8px', fontWeight: 600 }}>
              Conversation
            </div>
            {conversation.map((msg, i) => (
              <div key={i} style={{
                padding: '8px 12px', marginBottom: 6, borderRadius: 10,
                background: msg.role === 'user' ? 'rgba(14,165,233,0.08)' : 'rgba(16,185,129,0.06)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.12)'}`,
                fontSize: 12,
              }}>
                <div style={{ fontSize: 10, color: msg.role === 'user' ? '#0ea5e9' : '#10b981', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {msg.role === 'user' ? '👤 You' : `🤖 ${msg.type || 'AI'} Agent`}
                </div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
                  {msg.text.length > 180 ? msg.text.substring(0, 180) + '...' : msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(56,189,248,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#4a5568' }}>
            🎙️ Chrome recommended · Speak clearly
          </div>
          <button
            onClick={() => setConversation([])}
            style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 12, cursor: 'pointer' }}
          >Clear history</button>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.9); opacity: 0.3; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
