import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertTriangle, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const [sessionId] = useState(`session-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const quickActions = [
    { label: 'Book Appointment', icon: '📅', prompt: 'I want to schedule a new appointment.' },
    { label: 'Refill Prescription', icon: '💊', prompt: 'I need to refill my current medication.' },
    { label: 'Explain Lab Results', icon: '🔬', prompt: 'Can you explain my recent blood test results?' },
    { label: 'Insurance Coverage', icon: '🛡️', prompt: 'What is my coverage for specialist visits?' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          sessionId: sessionId,
          patientId: 'P-1001'
        })
      });

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'bot',
        content: data.content,
        intent: data.intent,
        status: data.status,
        traceId: data.traceId,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: 'I apologize, but I am having trouble connecting to my clinical database. Please try again or call our support line.',
        status: 'ERROR',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
      {/* Chat History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-6 min-h-[400px]"
      >
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <Bot className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold outfit mb-2">How can I assist you?</h3>
              <p className="text-slate-400 max-w-sm">I am your agentic health assistant. Choose a quick action or type your request below.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.prompt);
                  }}
                  className="glass p-4 rounded-2xl text-left hover:border-blue-500/50 hover:bg-blue-600/5 transition-all group"
                >
                  <span className="text-xl mb-2 block">{action.icon}</span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-blue-600/20 border-blue-500/30'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-blue-400" />}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none glass'
                  }`}>
                    {msg.content}
                    
                    {msg.role === 'bot' && msg.intent && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900/50 text-[10px] uppercase font-bold tracking-wider text-slate-400 border border-slate-700/50">
                          {msg.intent}
                        </span>
                        {msg.status === 'BLOCKED' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] uppercase font-bold border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Guardrail Stop
                          </span>
                        )}
                        {msg.status === 'ESCALATED' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Escalated
                          </span>
                        )}
                        {msg.status === 'RESOLVED' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-500 uppercase tracking-tighter ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.traceId && <span>• {msg.traceId}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                 <Bot className="w-4 h-4 text-blue-400" />
               </div>
               <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 glass">
                 <MoreHorizontal className="w-5 h-5 text-slate-400 animate-pulse" />
               </div>
             </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="mt-6 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about appointments, prescriptions, or lab results..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm glass text-slate-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Chat;
