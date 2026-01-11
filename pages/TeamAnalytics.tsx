
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface StaffPerformance {
  id: string;
  name: string;
  date: string;
  score: number;
  rank: number;
  badge: string;
  category: string;
  detection_count: number;
  dominant_emotion: string;
  tables_served: number;
  resolved_negative_trends: number;
}

const TeamAnalytics: React.FC = () => {
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'top_performer' | 'needs_support'>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Subscribe to staff_performance collection
    const staffRef = collection(db, 'staff_performance');
    const unsub = onSnapshot(staffRef, (snapshot) => {
      const staffList: StaffPerformance[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        staffList.push({
          id: docSnap.id,
          name: data.name || 'Unknown',
          date: data.date || '',
          score: data.score || 0,
          rank: data.rank || 0,
          badge: data.badge || 'Consistent',
          category: data.category || 'most_praised',
          detection_count: data.detection_count || 0,
          dominant_emotion: data.dominant_emotion || 'neutral',
          tables_served: data.tables_served || 0,
          resolved_negative_trends: data.resolved_negative_trends || 0
        });
      });
      // Sort by rank
      staffList.sort((a, b) => a.rank - b.rank);
      setStaffPerformance(staffList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching staff performance:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Get today's date
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Export to PDF
  const exportToPDF = () => {
    setExporting(true);
    
    const today = getTodayDate();
    const avgScore = staffPerformance.length > 0 
      ? (staffPerformance.reduce((sum, s) => sum + s.score, 0) / staffPerformance.length).toFixed(1)
      : '0';
    
    // Create PDF content as HTML
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Team Analytics Report - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
          h1 { color: #3F9AAE; margin-bottom: 5px; }
          h2 { color: #334155; margin-top: 30px; border-bottom: 2px solid #3F9AAE; padding-bottom: 10px; }
          .subtitle { color: #64748b; margin-bottom: 30px; }
          .stats { display: flex; gap: 20px; margin-bottom: 30px; }
          .stat-box { background: #f1f5f9; padding: 20px; border-radius: 10px; flex: 1; }
          .stat-value { font-size: 28px; font-weight: bold; color: #3F9AAE; }
          .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3F9AAE; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-high { background: #dbeafe; color: #3F9AAE; }
          .badge-consistent { background: #d1fae5; color: #059669; }
          .badge-support { background: #fee2e2; color: #dc2626; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🍽️ RestoInsight</h1>
        <p class="subtitle">Service Team Analytics Report - ${today}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${staffPerformance.length}</div>
            <div class="stat-label">Total Staff</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${avgScore}%</div>
            <div class="stat-label">Average Score</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${staffPerformance.filter(s => s.category === 'top_performer').length}</div>
            <div class="stat-label">Top Performers</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${staffPerformance.filter(s => s.category === 'needs_support').length}</div>
            <div class="stat-label">Needs Support</div>
          </div>
        </div>
        
        <h2>📊 Staff Performance Details</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
              <th>Badge</th>
              <th>Detections</th>
              <th>Tables Served</th>
              <th>Dominant Emotion</th>
            </tr>
          </thead>
          <tbody>
            ${staffPerformance.map(s => `
              <tr>
                <td><strong>#${s.rank}</strong></td>
                <td>${s.name}</td>
                <td><strong>${s.score.toFixed(0)}%</strong></td>
                <td><span class="badge ${s.badge === 'High Empathy' ? 'badge-high' : s.badge === 'Consistent' ? 'badge-consistent' : 'badge-support'}">${s.badge}</span></td>
                <td>${s.detection_count}</td>
                <td>${s.tables_served}</td>
                <td>${s.dominant_emotion}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated by RestoInsight • ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setExporting(false);
      };
    } else {
      alert('Please allow popups to export the report');
      setExporting(false);
    }
  };

  // Filter staff based on selected tab
  const filteredStaff = staffPerformance.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'top_performer') return s.category === 'top_performer' || s.category === 'most_praised';
    if (filter === 'needs_support') return s.category === 'needs_support';
    return true;
  });

  // Get top 3 performers
  const topPerformers = staffPerformance.slice(0, 3);

  // Calculate team average score
  const avgScore = staffPerformance.length > 0 
    ? (staffPerformance.reduce((sum, s) => sum + s.score, 0) / staffPerformance.length).toFixed(1)
    : '0';

  // Get badge color
  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'High Empathy': return 'bg-primary/10 text-primary';
      case 'Consistent': return 'bg-mint/10 text-mint';
      case 'Needs Support': return 'bg-accent/10 text-accent';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      happy: '😊', neutral: '😐', sad: '😢', angry: '😠', fear: '😰', surprise: '😮', disgust: '🤢'
    };
    return emojis[emotion] || '😐';
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          <p className="mt-4 text-slate-500 font-medium">Loading team analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight font-display italic">Service Team Analytics</h1>
          <p className="text-slate-500 font-medium">Overview of waiter performance and customer experience for today.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-base font-black text-slate-800 shadow-sm">
            <span className="material-symbols-outlined text-xl text-primary">calendar_today</span> {getTodayDate()}
          </div>
          <button 
            onClick={exportToPDF}
            disabled={exporting || staffPerformance.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="material-symbols-outlined text-xl">{exporting ? 'hourglass_empty' : 'download'}</span> 
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-500 fill-1">emoji_events</span>
              Top Performers
            </h3>
            <span className="text-[10px] font-black px-3 py-1.5 bg-mint/10 text-primary rounded-full uppercase tracking-widest">Performance Score</span>
          </div>
          <div className="space-y-4">
            {topPerformers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">groups</span>
                <p className="text-sm font-medium">No performance data yet</p>
              </div>
            ) : (
              topPerformers.map((top, idx) => (
                <div key={top.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <span className={`text-xl font-black w-4 ${
                       idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'
                     }`}>{top.rank}</span>
                     <div className="relative">
                        <div className={`size-12 rounded-full flex items-center justify-center text-2xl ${
                          idx === 0 ? 'bg-yellow-100' : idx === 1 ? 'bg-slate-200' : 'bg-orange-100'
                        }`}>
                          {getEmotionEmoji(top.dominant_emotion)}
                        </div>
                        {idx === 0 && <span className="absolute -bottom-1 -right-1 text-xs">👑</span>}
                     </div>
                     <div>
                       <p className="font-black text-slate-800 text-sm">{top.name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">{top.badge}</p>
                     </div>
                   </div>
                   <div className="text-right flex items-center gap-4">
                     <div>
                       <p className="text-lg font-black text-primary">{top.score.toFixed(0)}%</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase">Score</p>
                     </div>
                     <span className="material-symbols-outlined text-slate-200 group-hover:text-primary transition-colors">chevron_right</span>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Balance Chart (Visualization) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">radar</span> Team Balance
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Current</span>
               <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-300"></span> Benchmark</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
            <div className="relative size-64 flex items-center justify-center">
              <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
              <div className="absolute inset-4 border border-slate-100 rounded-full"></div>
              <div className="absolute inset-8 border border-slate-100 rounded-full"></div>
              
              <svg className="size-full absolute drop-shadow-xl" viewBox="0 0 100 100">
                <polygon fill="rgba(63, 154, 174, 0.2)" points="50,15 85,35 80,80 20,80 15,35" stroke="#3F9AAE" strokeWidth="1.5"></polygon>
              </svg>

              <span className="absolute -top-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Speed</span>
              <span className="absolute -right-4 top-1/3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Connection</span>
              <span className="absolute -left-4 top-1/3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Friendliness</span>
              <span className="absolute bottom-4 -right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Stability</span>
              <span className="absolute bottom-4 -left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Accuracy</span>

              <div className="flex flex-col items-center">
                <span className="text-4xl font-black text-primary italic">{avgScore}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Avg Score</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
             <button 
               onClick={() => setFilter('all')}
               className={`px-6 py-2.5 rounded-xl font-black text-sm italic transition-all ${
                 filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
               }`}
             >
               All Staff
             </button>
             <button 
               onClick={() => setFilter('top_performer')}
               className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                 filter === 'top_performer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
               }`}
             >
               Most Praised
             </button>
             <button 
               onClick={() => setFilter('needs_support')}
               className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                 filter === 'needs_support' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
               }`}
             >
               Needs Support 
               {staffPerformance.filter(s => s.category === 'needs_support').length > 0 && (
                 <span className="size-2 rounded-full bg-accent animate-pulse"></span>
               )}
             </button>
           </div>
           <div className="h-px flex-1 bg-slate-100"></div>
           <span className="text-xs font-bold text-slate-400">{staffPerformance.length} STAFF MEMBERS</span>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">groups</span>
            <p className="font-medium">No staff in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredStaff.map((member) => (
              <div 
                key={member.id} 
                className={`group p-6 rounded-3xl bg-white border-2 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  member.category === 'needs_support' ? 'border-accent/30' : 'border-slate-50'
                }`}
              >
                <div className={`h-1.5 w-full rounded-full mb-6 ${member.category === 'needs_support' ? 'bg-accent' : 'bg-primary'}`}></div>
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                     <div className={`size-12 rounded-full flex items-center justify-center text-2xl ${
                       member.category === 'needs_support' ? 'bg-accent/10' : 'bg-primary/10'
                     }`}>
                       {getEmotionEmoji(member.dominant_emotion)}
                     </div>
                     <div>
                       <h4 className="font-black text-slate-800 text-sm">{member.name}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                         {member.tables_served} tables served
                       </p>
                     </div>
                   </div>
                   <span className="material-symbols-outlined text-slate-200 group-hover:text-primary cursor-pointer">more_vert</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Score</p>
                     <div className="flex items-center gap-1">
                       <span className={`text-base font-black ${member.category === 'needs_support' ? 'text-accent' : 'text-slate-800'}`}>
                         {member.score.toFixed(0)}%
                       </span>
                       <span className={`material-symbols-outlined text-sm ${member.category === 'needs_support' ? 'text-accent' : 'text-primary'}`}>
                         {member.category === 'needs_support' ? 'trending_down' : 'trending_up'}
                       </span>
                     </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Detections</p>
                     <div className="flex items-center gap-1">
                       <span className={`text-base font-black ${member.category === 'needs_support' ? 'text-accent' : 'text-primary'}`}>
                         {member.detection_count}
                       </span>
                       <span className="material-symbols-outlined text-slate-400 text-sm">visibility</span>
                     </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                   <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${getBadgeColor(member.badge)}`}>
                     {member.badge}
                   </span>
                   {member.resolved_negative_trends > 0 && (
                     <span className="text-[10px] font-bold text-mint flex items-center gap-1">
                       <span className="material-symbols-outlined text-xs">thumb_up</span>
                       +{member.resolved_negative_trends}
                     </span>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAnalytics;
