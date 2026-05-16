import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Users, Activity, AlertTriangle, ShieldCheck, 
  ChevronUp, ChevronDown, Clock, MousePointer2 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = ({ metrics }) => {
  if (!metrics) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Syncing clinical data...</p>
      </div>
    </div>
  );

  const stats = [
    { label: 'Total Inquiries', value: metrics.totalInquiries, icon: Users, color: 'blue', change: '+12%', trend: 'up' },
    { label: 'Escalation Rate', value: `${(metrics.escalationRate * 100).toFixed(0)}%`, icon: Activity, color: 'amber', change: '-2%', trend: 'down' },
    { label: 'FCR Rate', value: `${(metrics.fcrRate * 100).toFixed(0)}%`, icon: ShieldCheck, color: 'emerald', change: '+5%', trend: 'up' },
    { label: 'Avg Latency', value: `${metrics.averageLatencyMs}ms`, icon: Clock, color: 'indigo', change: '-8%', trend: 'down' },
  ];

  const pieData = Object.entries(metrics.intentDistribution).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0ea5e9', '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#94a3b8'];

  // Use real time series if available, otherwise fallback to empty
  const lineData = metrics.timeseries && metrics.timeseries.length > 0 
    ? metrics.timeseries 
    : [{ time: '00:00', latency: 0 }];

  return (
    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight outfit">System Monitoring</h2>
            <p className="text-slate-400 mt-1">Real-time performance and compliance metrics</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
               Live Refresh Active
             </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all hover:-translate-y-1"
            >
              <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:bg-${stat.color}-500/10 transition-all`}></div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${stat.trend === 'up' ? 'text-emerald-500' : stat.trend === 'down' ? 'text-rose-500' : 'text-slate-500'}`}>
                  {stat.trend === 'up' ? <ChevronUp className="w-3 h-3" /> : stat.trend === 'down' ? <ChevronDown className="w-3 h-3" /> : null}
                  {stat.change}
                </div>
              </div>
              
              <div className="mt-4 relative z-10">
                <p className="text-3xl font-bold tracking-tight outfit">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Latency Chart */}
          <div className="lg:col-span-2 glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg outfit">Response Latency (ms)</h3>
              <select className="bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] px-2 py-1 focus:outline-none">
                <option>Last 24 Hours</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px'}}
                    itemStyle={{color: '#f8fafc', fontSize: '12px'}}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorLat)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Intent Distribution */}
          <div className="glass p-6 rounded-3xl">
            <h3 className="font-bold text-lg outfit mb-8">Intent Distribution</h3>
            <div className="h-[250px] w-full">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px'}}
                       itemStyle={{color: '#f8fafc', fontSize: '12px'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
                  No interaction data yet
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                  <span className="text-[10px] text-slate-400 capitalize font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Security & Compliance Log */}
        <div className="glass p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg outfit">Compliance & Safety Log</h3>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Fully Compliant
            </span>
          </div>
          <div className="space-y-4">
            {[
              { event: 'Session Purged', detail: 'Session S-882 destroyed after 30min inactivity', time: '2m ago', status: 'secure' },
              { event: 'PII Redacted', detail: 'Detected possible SSN pattern in inquiry P-991', time: '14m ago', status: 'warning' },
              { event: 'Emergency Escalation', detail: 'Patient report of chest pain routed to triage', time: '1h ago', status: 'critical' },
              { event: 'Audit Sync', detail: 'Successfully synced 124 logs to immutable audit trail', time: '3h ago', status: 'secure' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    log.status === 'secure' ? 'bg-emerald-500' : log.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-200 tracking-tight">{log.event}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-600">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
