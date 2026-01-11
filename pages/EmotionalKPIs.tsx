
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';

const EmotionalKPIs: React.FC = () => {
  const trendData = [
    { name: 'Mon', positive: 35, negative: 15 },
    { name: 'Tue', positive: 45, negative: 12 },
    { name: 'Wed', positive: 55, negative: 18 },
    { name: 'Thu', positive: 48, negative: 14 },
    { name: 'Fri', positive: 65, negative: 20 },
    { name: 'Sat', positive: 75, negative: 12 },
    { name: 'Sun', positive: 70, negative: 10 },
  ];

  const lostOppData = [
    { category: 'Wait Time', value: 65 },
    { category: 'Food Temp', value: 45 },
    { category: 'Service', value: 25 },
    { category: 'Ambiance', value: 15 },
  ];

  const tableTimeData = [
    { day: 'M', value: 45 },
    { day: 'T', value: 38 },
    { day: 'W', value: 52 },
    { day: 'T', value: 58 },
    { day: 'F', value: 62 },
    { day: 'S', value: 65 },
    { day: 'S', value: 60 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
            Dashboard <span className="material-symbols-outlined text-[10px]">arrow_forward_ios</span> <span className="text-slate-400">Emotional Overview</span>
          </p>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Guest Experience Overview</h1>
          <p className="text-slate-500 font-medium">Weekly emotional analysis and operational insights.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          <span className="material-symbols-outlined">download</span>
          Download Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Avg Sentiment', value: '8.4/10', trend: '+0.2%', icon: 'mood', color: 'text-primary', bg: 'bg-mint/10' },
          { label: 'Guests at Risk', value: '12', trend: '-3%', icon: 'sentiment_dissatisfied', color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Avg Table Turnover', value: '55m', trend: '+2m', icon: 'timer', color: 'text-yellow-600', bg: 'bg-cream/40' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 group hover:shadow-md transition-all">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className={`material-symbols-outlined ${stat.color} p-2 ${stat.bg} rounded-xl`}>{stat.icon}</span>
              {stat.label}
            </div>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-3xl font-black text-slate-800">{stat.value}</span>
              <span className="bg-mint/20 text-primary text-[10px] font-black px-2 py-1 rounded-lg mb-1">{stat.trend}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">Based on 1,240 feedback entries</p>
          </div>
        ))}
      </div>

      {/* Main Trend Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Weekly Emotional Trend</h3>
            <p className="text-sm text-slate-500 font-medium">Overall guest sentiment fluctuation over the last 7 days</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
              <span className="size-2.5 rounded-full bg-primary"></span> Positive
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
              <span className="size-2.5 rounded-full bg-accent"></span> Negative
            </span>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3F9AAE" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3F9AAE" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 800 }}
              />
              <Area type="monotone" dataKey="positive" stroke="#3F9AAE" strokeWidth={4} fillOpacity={1} fill="url(#colorPos)" />
              <Area type="monotone" dataKey="negative" stroke="#F96E5B" strokeWidth={2} strokeDasharray="5 5" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-accent font-black">priority_high</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Lost Opportunities</h3>
          </div>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {lostOppData.map((item) => (
              <div key={item.category} className="space-y-2 group">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">
                  <span>{item.category}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full group-hover:bg-red-600 transition-all" style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">table_restaurant</span>
              Avg Table Time
            </h3>
            <span className="bg-primary/20 text-primary text-[10px] font-black uppercase px-3 py-1 rounded-lg border border-primary/20">Last Week</span>
          </div>
          <div className="h-[200px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tableTimeData}>
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {tableTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3F9AAE33' : '#3F9AAE'} />
                  ))}
                </Bar>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: 'transparent'}} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalKPIs;
