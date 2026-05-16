import React, { useState, useEffect } from 'react';
import { Layout, MessageSquare, BarChart3, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col font-inter">
      {/* Header */}
      <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight outfit">CADUCEUS <span className="text-blue-400 font-medium text-sm ml-1 uppercase tracking-widest">AI</span></h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">Agentic Healthcare Orchestrator</p>
          </div>
        </div>

        <nav className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Patient Hub
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Monitoring
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">HIPAA Secure</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
             <div className="w-full h-full bg-gradient-to-tr from-slate-700 to-slate-600"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Background blobs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="h-full relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <Chat onMessageSent={() => {}} />
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Dashboard metrics={metrics} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Footer / Status */}
      <footer className="h-10 border-t border-slate-800 px-8 flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/50">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            System Load: 12%
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            Guardrails Active: 14/14
          </span>
        </div>
        <div className="font-medium">
          v1.2.4-PROD | Build 2026.05.15
        </div>
      </footer>
    </div>
  );
}

export default App;
