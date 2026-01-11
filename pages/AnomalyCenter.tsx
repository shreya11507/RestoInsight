
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface Alert {
  id: string;
  table_number: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  root_cause?: string;
  ai_recommendation?: string;
  urgency_score?: number;
  is_resolved: boolean;
  resolved_at?: any;
  created_at: any;
}

const AnomalyCenter: React.FC = () => {
  const [showResolved, setShowResolved] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to alerts collection
    const alertsRef = collection(db, 'alerts');
    const unsub = onSnapshot(alertsRef, (snapshot) => {
      const alertList: Alert[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        alertList.push({
          id: docSnap.id,
          table_number: data.table_number || 0,
          alert_type: data.alert_type || '',
          severity: data.severity || 'warning',
          title: data.title || '',
          description: data.description || '',
          root_cause: data.root_cause || null,
          ai_recommendation: data.ai_recommendation || null,
          urgency_score: data.urgency_score || null,
          is_resolved: data.is_resolved || false,
          resolved_at: data.resolved_at,
          created_at: data.created_at
        });
      });
      // Sort by created_at
      alertList.sort((a, b) => {
        const timeA = a.created_at?.seconds || 0;
        const timeB = b.created_at?.seconds || 0;
        return timeB - timeA;
      });
      setAlerts(alertList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching alerts:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Format relative time
  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    const seconds = timestamp.seconds || Math.floor(Date.parse(timestamp) / 1000);
    const now = Math.floor(Date.now() / 1000);
    const diff = now - seconds;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(seconds * 1000).toLocaleDateString();
  };

  // Build history from resolved alerts
  const history = alerts
    .filter(a => a.is_resolved)
    .slice(0, 5)
    .map(a => ({
      time: a.resolved_at ? new Date(a.resolved_at.seconds * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      title: a.title.replace(':', ' Resolved:'),
      desc: a.ai_recommendation || a.description,
      status: 'mint'
    }));

  // Filter state for category buttons
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Filter based on toggle and category
  const filteredAlerts = alerts
    .filter(a => showResolved ? a.is_resolved : !a.is_resolved)
    // Exclude API error alerts
    .filter(a => a.root_cause !== 'Unable to analyze - API error')
    // Apply category filter
    .filter(a => {
      if (!activeFilter) return true;
      if (activeFilter === 'urgent') return a.severity === 'urgent';
      if (activeFilter === 'waiting') return a.alert_type.includes('service_dissatisfaction') || a.description.toLowerCase().includes('wait');
      if (activeFilter === 'angry') return a.alert_type.includes('dispute') || a.description.toLowerCase().includes('angry');
      if (activeFilter === 'delay') return a.description.toLowerCase().includes('delay');
      return true;
    });

  // Get active anomalies
  const anomalies = filteredAlerts.map(a => ({
    id: a.id,
    table: String(a.table_number).padStart(2, '0'),
    emoji: a.severity === 'urgent' ? '😡' : a.alert_type.includes('dispute') ? '🔥' : '⏳',
    type: a.severity === 'urgent' ? 'Urgent' : 'Warning',
    severity: a.severity,
    alert_type: a.alert_type,
    urgency_score: a.urgency_score,
    root_cause: a.root_cause,
    description: a.description,
    reco: a.ai_recommendation || null,
    is_resolved: a.is_resolved,
    created_at: a.created_at
  }));

  // Count for filter badges (from unresolved, non-error alerts)
  const validAlerts = alerts.filter(a => !a.is_resolved && a.root_cause !== 'Unable to analyze - API error');
  const urgentCount = validAlerts.filter(a => a.severity === 'urgent').length;
  const waitingCount = validAlerts.filter(a => a.alert_type.includes('service_dissatisfaction') || a.description.toLowerCase().includes('wait')).length;
  const angryCount = validAlerts.filter(a => a.alert_type.includes('dispute') || a.description.toLowerCase().includes('angry')).length;
  const delayCount = validAlerts.filter(a => a.description.toLowerCase().includes('delay')).length;

  const handleResolve = async (alertId: string) => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        is_resolved: true,
        resolved_at: Timestamp.now(),
        resolved_by: 'Manager'
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          <p className="mt-4 text-slate-500 font-medium">Loading anomalies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Alert History Sidebar (Inner) */}
      <aside className="hidden xl:flex flex-col w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest">Alert History</h3>
          <button className="text-[10px] font-bold text-slate-400 hover:text-primary flex items-center gap-1">
            FILTER <span className="material-symbols-outlined text-sm">filter_list</span>
          </button>
        </div>
        <div className="p-6 space-y-8 relative">
          <div className="absolute left-[30px] top-6 bottom-0 w-0.5 bg-slate-100"></div>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">history</span>
              <p className="text-xs font-medium">No resolved alerts yet</p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="flex gap-6 relative">
                <div className="z-10 mt-1">
                  <div className={`size-3 rounded-full border-4 border-white shadow-sm ${item.status === 'mint' ? 'bg-mint' : 'bg-cream'}`}></div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{item.time}</span>
                  <p className="text-sm font-black text-slate-800 leading-tight">{item.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">Active Anomalies</h1>
              <p className="text-slate-500 font-medium">AI-detected service failures requiring immediate attention.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <span className={`text-xs font-bold ${!showResolved ? 'text-slate-800' : 'text-slate-400'}`}>Unresolved</span>
              <button 
                onClick={() => setShowResolved(!showResolved)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${showResolved ? 'bg-mint' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showResolved ? 'translate-x-6' : ''}`}></div>
              </button>
              <span className={`text-xs font-bold ${showResolved ? 'text-primary' : 'text-slate-400'}`}>Resolved</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* All button */}
            <button 
              onClick={() => setActiveFilter(null)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                activeFilter === null 
                  ? 'bg-primary text-white border-2 border-primary' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-primary'
              }`}
            >
              <span className="text-sm font-black">All</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {validAlerts.length}
              </span>
            </button>

            {/* Urgent button */}
            <button 
              onClick={() => setActiveFilter(activeFilter === 'urgent' ? null : 'urgent')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                activeFilter === 'urgent' 
                  ? 'bg-accent/10 border-2 border-accent text-accent' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-accent'
              }`}
            >
              <span className="text-sm font-black italic">Urgent 🚨</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === 'urgent' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600'}`}>
                {urgentCount}
              </span>
            </button>

            {/* Waiting button */}
            <button 
              onClick={() => setActiveFilter(activeFilter === 'waiting' ? null : 'waiting')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                activeFilter === 'waiting' 
                  ? 'bg-orange-100 border-2 border-orange-400 text-orange-600' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-400'
              }`}
            >
              <span className="text-sm font-bold">Waiting too long ⏳</span>
              {waitingCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === 'waiting' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {waitingCount}
                </span>
              )}
            </button>

            {/* Angry button */}
            <button 
              onClick={() => setActiveFilter(activeFilter === 'angry' ? null : 'angry')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                activeFilter === 'angry' 
                  ? 'bg-red-100 border-2 border-red-400 text-red-600' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-red-400'
              }`}
            >
              <span className="text-sm font-bold">Guest angry 😡</span>
              {angryCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === 'angry' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {angryCount}
                </span>
              )}
            </button>

            {/* Delay button */}
            <button 
              onClick={() => setActiveFilter(activeFilter === 'delay' ? null : 'delay')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                activeFilter === 'delay' 
                  ? 'bg-blue-100 border-2 border-blue-400 text-blue-600' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
              }`}
            >
              <span className="text-sm font-bold">Service delay 🐢</span>
              {delayCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === 'delay' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {delayCount}
                </span>
              )}
            </button>
          </div>

          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
              <p className="text-xl font-bold">{showResolved ? 'No resolved anomalies' : activeFilter ? 'No matching alerts' : 'All Clear!'}</p>
              <p className="text-sm">{showResolved ? 'Resolved alerts will appear here.' : 'No active anomalies at this time.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {anomalies.map((card, idx) => (
                <div 
                  key={card.id} 
                  className={`group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 border-2 shadow-sm ${
                    card.is_resolved ? 'bg-mint/5 border-mint/30' :
                    card.severity === 'urgent' ? 'bg-accent/5 border-accent ring-8 ring-accent/5' : 'bg-white border-slate-100 hover:border-mint'
                  }`}
                >
                  <div className={`p-6 flex justify-between items-start border-b ${
                    card.is_resolved ? 'bg-mint/10 border-mint/20' :
                    card.severity === 'urgent' ? 'bg-accent/10 border-accent/20' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Table {card.table}</h3>
                        {card.severity === 'urgent' && !card.is_resolved && <span className="bg-accent text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Urgent</span>}
                        {card.is_resolved && <span className="bg-mint text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Resolved</span>}
                        {card.urgency_score && !card.is_resolved && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            card.urgency_score >= 8 ? 'bg-accent/20 text-accent' : 
                            card.urgency_score >= 5 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Urgency: {card.urgency_score}/10
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {card.created_at ? formatRelativeTime(card.created_at) : 'Just now'}
                      </div>
                    </div>
                    <div className="text-4xl drop-shadow-sm">{card.is_resolved ? '✅' : card.emoji}</div>
                  </div>

                  <div className="p-6 flex flex-col gap-5 flex-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="material-symbols-outlined text-primary text-xl">
                          {card.is_resolved ? 'check_circle' : 'timer'}
                        </span>
                        <span>{card.is_resolved ? 'Resolved' : card.type}</span>
                      </div>
                      {card.root_cause && (
                        <div className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          <span className="text-[10px]">AI Analyzed</span>
                        </div>
                      )}
                    </div>

                    {/* Root Cause - from AI or description */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-slate-100/50">
                      <p className="text-[10px] text-slate-400 uppercase font-black mb-1.5 tracking-widest flex items-center gap-1">
                        {card.root_cause ? (
                          <>
                            <span className="material-symbols-outlined text-xs text-primary">psychology</span>
                            AI Root Cause Analysis
                          </>
                        ) : 'Issue Description'}
                      </p>
                      <p className="text-slate-800 text-sm font-medium leading-tight">
                        {card.root_cause || card.description}
                      </p>
                    </div>

                    {/* AI Recommendation */}
                    {card.reco && (
                      <div className="bg-cream/20 p-4 rounded-2xl border border-cream/40 flex gap-3">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5">auto_awesome</span>
                        <div>
                          <p className="text-[10px] text-primary font-black uppercase mb-1 tracking-widest">Gemini Recommendation</p>
                          <p className="text-xs text-slate-700 leading-snug">{card.reco}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Button - only show for unresolved */}
                    {!card.is_resolved && (
                      <div className="mt-auto">
                        <button 
                          onClick={() => handleResolve(card.id)}
                          className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                            card.severity === 'urgent' ? 'bg-accent text-white hover:bg-red-600 shadow-accent/20' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnomalyCenter;
