
import React from 'react';

const GuestInsights: React.FC = () => {
  const sessions = [
    { id: '42', table: '5', time: '18:30', guests: 2, status: 'Happy', emoji: 'sentiment_very_satisfied', active: true, progress: 75, color: 'mint' },
    { id: '12', table: '8', time: '19:15', guests: 4, status: 'Frustrated', emoji: 'sentiment_dissatisfied', alert: 'Long Wait', color: 'accent' },
    { id: '08', table: '3', time: '19:00', guests: 2, status: 'Neutral', emoji: 'sentiment_neutral', color: 'slate-400' },
    { id: '15', table: '9', time: '19:40', guests: 6, status: 'Happy', emoji: 'sentiment_satisfied', color: 'mint' },
  ];

  const timeline = [
    { time: '18:30', title: 'Guest Arrival', desc: 'Seated at Table 5 by Hostess', type: 'mint', icon: 'door_front' },
    { time: '18:42', title: 'Order Placed', desc: 'Appetizers & Drinks ordered', type: 'mint', icon: 'menu_book' },
    { time: '19:10', title: 'Long Wait for Main Course', desc: 'Wait time exceeded 25 mins without update.', type: 'accent', icon: 'timelapse', alert: true },
    { time: '19:35', title: 'Dessert Served (Comped)', desc: 'Manager apologized, free tiramisu offered.', type: 'mint', icon: 'cake' },
    { time: '19:45', title: 'Customer Feedback', desc: '"Main took a while, but dessert was amazing! Thanks."', type: 'info', icon: 'rate_review' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden lg:flex flex-col w-96 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-slate-800 tracking-tight italic">Active Sessions</h2>
          <div className="flex flex-wrap gap-2">
             <button className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-black text-accent border border-accent/20">
               <span className="material-symbols-outlined text-sm">warning</span> Frustrated (3)
             </button>
             <button className="flex items-center gap-1.5 rounded-full bg-mint/10 px-3 py-1.5 text-[10px] font-black text-primary border border-mint/20">
               <span className="material-symbols-outlined text-sm">sentiment_satisfied</span> Happy (12)
             </button>
             <button className="px-3 py-1.5 rounded-full bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all">
               Long waits (2)
             </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group hover:shadow-lg ${
                session.active ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                    <div className={`size-12 flex items-center justify-center rounded-full font-black text-lg ${
                      session.active ? 'bg-white text-primary shadow-md' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {session.id}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 leading-tight">Table {session.table}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Arrived {session.time} • {session.guests} Guests</p>
                    </div>
                 </div>
                 <span className={`material-symbols-outlined ${session.color === 'mint' ? 'text-mint' : session.color === 'accent' ? 'text-accent' : 'text-slate-300'}`}>{session.emoji}</span>
              </div>
              {session.active ? (
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-mint rounded-full" style={{ width: `${session.progress}%` }}></div>
                </div>
              ) : session.alert ? (
                <div className="flex items-center gap-2">
                  <span className="bg-accent/10 text-accent text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">Long Wait</span>
                  <span className="text-[9px] font-bold text-slate-300 italic">Last update: 5m ago</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-bg-soft">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-8">
             <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight font-display italic">Guest Journey #42</h1>
                  <span className="bg-mint/10 text-primary text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-mint/20">VIP Member</span>
                </div>
                <p className="text-slate-500 font-medium">Table 5 • Server: Sarah J. • Party of 2</p>
             </div>
             <div className="flex gap-4">
               <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-800 shadow-sm hover:shadow-md transition-all">
                 <span className="material-symbols-outlined text-xl text-primary">history</span> View Full History
               </button>
               <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                 <span className="material-symbols-outlined text-xl">ios_share</span> Export Summary
               </button>
             </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             {[
               { label: 'Time at Table', val: '1h 15m', sub: '+5m vs avg', icon: 'schedule', color: 'text-primary' },
               { label: 'Satisfaction', val: '4.8/5.0', sub: 'Based on live feedback', icon: 'thumb_up', color: 'text-mint' },
               { label: 'Return Rate', val: 'Very High', sub: 'Visited 3x this month', icon: 'replay', color: 'text-primary' }
             ].map(stat => (
               <div key={stat.label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 hover:shadow-md transition-all">
                 <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                   <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span> {stat.label}
                 </div>
                 <div className="text-2xl font-black text-slate-800 mb-1">{stat.val}</div>
                 <p className="text-[10px] font-bold text-slate-400 italic">{stat.sub}</p>
               </div>
             ))}
          </div>

          {/* Emotion Map Simulation */}
          <div className="p-10 rounded-[3xl] bg-cream/20 border-2 border-cream/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-48 p-4 opacity-5 pointer-events-none rotate-12 group-hover:rotate-0 transition-transform duration-700">
               <span className="material-symbols-outlined text-[180px] text-primary fill-1">ecg_heart</span>
            </div>
            <div className="relative z-10 space-y-8">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-800 italic">Emotional Journey</h3>
                 <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                       <span className="size-2.5 rounded-full bg-mint"></span> Positive
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                       <span className="size-2.5 rounded-full bg-accent"></span> Negative
                    </span>
                 </div>
               </div>
               
               <div className="relative h-48 w-full bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 flex items-center justify-center">
                  <svg className="w-full h-full p-4 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                    <path d="M0,25 C10,20 20,5 30,15 C40,25 50,45 60,40 C70,35 80,10 90,5 L100,5" fill="none" stroke="#79C9C5" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="55" cy="42" r="3" fill="#F96E5B" stroke="white" strokeWidth="2" />
                  </svg>
                  <div className="absolute inset-0 flex justify-between px-10 items-end pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pointer-events-none">
                    <span>Entry</span>
                    <span className="translate-x--4">Ordering</span>
                    <span className="text-accent font-black">Wait</span>
                    <span>Dessert</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Session Timeline</h3>
            <div className="relative pl-10 space-y-10">
              <div className="absolute left-4 top-4 bottom-4 w-1 bg-slate-100 rounded-full"></div>
              {timeline.map((item, idx) => (
                <div key={idx} className="relative group animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 150}ms` }}>
                  <div className={`absolute -left-10 top-2 size-12 rounded-full border-4 border-white flex items-center justify-center shadow-md z-10 transition-transform group-hover:scale-110 ${
                    item.type === 'accent' ? 'bg-accent text-white animate-pulse' : 
                    item.type === 'info' ? 'bg-slate-500 text-white' : 'bg-mint text-white'
                  }`}>
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <div className={`p-6 rounded-3xl shadow-sm border-2 transition-all hover:shadow-xl ${
                    item.type === 'accent' ? 'bg-accent/10 border-accent text-accent' : 
                    item.type === 'info' ? 'bg-white border-slate-100' : 'bg-mint/10 border-mint/20 text-primary'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <h4 className={`text-lg font-black leading-tight ${item.type === 'info' ? 'text-slate-800' : ''}`}>{item.title}</h4>
                           {item.alert && <span className="bg-white/20 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Alert</span>}
                         </div>
                         <p className={`text-sm font-medium leading-snug ${item.type === 'info' ? 'text-slate-500 italic' : 'opacity-80'}`}>{item.desc}</p>
                       </div>
                       <span className="text-xs font-black opacity-60 font-mono tracking-tighter">{item.time}</span>
                    </div>
                    {item.alert && (
                      <div className="mt-6 flex gap-3">
                         <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">Notify Manager</button>
                         <button className="bg-white text-accent px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-widest">Comp Item</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestInsights;
