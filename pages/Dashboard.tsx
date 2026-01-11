
import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { db } from '../firebase';
import { doc, collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';

interface RealtimeMetrics {
  guests_inside: number;
  total_walkins: number;
  avg_table_time: number;
  service_score: number;
  happy_pct: number;
  neutral_pct: number;
  confused_pct: number;
  angry_pct: number;
  current_vibe: number;
}

interface Alert {
  id: string;
  table_number: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: any;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to realtime metrics
    const metricsRef = doc(db, 'realtime_metrics', 'current');
    const unsubMetrics = onSnapshot(metricsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMetrics({
          guests_inside: data.guests_inside || data.total_walkins || 0,
          total_walkins: data.total_walkins || 0,
          avg_table_time: data.avg_table_time || 45,
          service_score: data.service_score || 0,
          happy_pct: data.happy_pct || 0,
          neutral_pct: data.neutral_pct || 0,
          confused_pct: data.confused_pct || 0,
          angry_pct: data.angry_pct || 0,
          current_vibe: data.current_vibe || data.service_score || 50
        });
      } else {
        console.log('No realtime_metrics/current document found');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching metrics:', err);
      setError(err.message);
      setLoading(false);
    });

    // Subscribe to alerts - simple query without composite index requirement
    const alertsRef = collection(db, 'alerts');
    const unsubAlerts = onSnapshot(alertsRef, (snapshot) => {
      const alertList: Alert[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show unresolved alerts
        if (!data.is_resolved) {
          alertList.push({
            id: docSnap.id,
            table_number: data.table_number || 0,
            alert_type: data.alert_type || '',
            severity: data.severity || 'warning',
            title: data.title || '',
            description: data.description || '',
            is_resolved: data.is_resolved || false,
            created_at: data.created_at
          });
        }
      });
      // Sort by created_at manually (to avoid index requirement)
      alertList.sort((a, b) => {
        const timeA = a.created_at?.seconds || 0;
        const timeB = b.created_at?.seconds || 0;
        return timeB - timeA;
      });
      setAlerts(alertList.slice(0, 5));
    }, (err) => {
      console.error('Error fetching alerts:', err);
    });

    return () => {
      unsubMetrics();
      unsubAlerts();
    };
  }, []);

  // Build sentiments from metrics
  const sentiments = metrics ? [
    { label: 'Happy', value: metrics.happy_pct, emoji: '😊', color: 'text-mint', bg: 'bg-mint/10', circleColor: '#79C9C5' },
    { label: 'Neutral', value: metrics.neutral_pct, emoji: '😐', color: 'text-cream', bg: 'bg-cream/10', circleColor: '#FFE2AF' },
    { label: 'Confused', value: metrics.confused_pct, emoji: '😕', color: 'text-orange-400', bg: 'bg-orange-400/10', circleColor: '#fb923c' },
    { label: 'Angry', value: metrics.angry_pct, emoji: '😠', color: 'text-accent', bg: 'bg-accent/10', circleColor: '#F96E5B' },
  ] : [
    { label: 'Happy', value: 0, emoji: '😊', color: 'text-mint', bg: 'bg-mint/10', circleColor: '#79C9C5' },
    { label: 'Neutral', value: 0, emoji: '😐', color: 'text-cream', bg: 'bg-cream/10', circleColor: '#FFE2AF' },
    { label: 'Confused', value: 0, emoji: '😕', color: 'text-orange-400', bg: 'bg-orange-400/10', circleColor: '#fb923c' },
    { label: 'Angry', value: 0, emoji: '😠', color: 'text-accent', bg: 'bg-accent/10', circleColor: '#F96E5B' },
  ];

  // Get alert icon based on type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'dispute_staff_customer': return 'group_off';
      case 'dispute_customers': return 'groups';
      case 'service_dissatisfaction': return 'sentiment_dissatisfied';
      default: return 'warning';
    }
  };

  // Get alert color based on severity
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'bg-accent/10 text-accent';
      case 'warning': return 'bg-orange-100 text-orange-500';
      default: return 'bg-blue-100 text-blue-500';
    }
  };

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

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          <p className="mt-4 text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
          <p className="text-red-700 font-medium">Error loading data: {error}</p>
          <p className="text-red-500 text-sm mt-2">Check browser console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Guests Inside" 
          value={metrics?.guests_inside || 0} 
          trend="Live count" 
          trendUp 
          icon="groups" 
          color="bg-mint" 
        />
        <StatCard 
          label="Today's Walk-ins" 
          value={metrics?.total_walkins || 0} 
          trend="Total today" 
          trendUp 
          icon="door_front" 
          color="bg-primary" 
        />
        <StatCard 
          label="Avg Table Time" 
          value={`${metrics?.avg_table_time || 0}m`} 
          trend="Optimal range" 
          icon="timer" 
          color="bg-cream" 
        />
        <StatCard 
          label="Service Score" 
          value={`${metrics?.service_score || 0}%`} 
          trend={metrics?.service_score && metrics.service_score >= 70 ? "Good performance" : "Needs attention"} 
          trendUp={metrics?.service_score ? metrics.service_score >= 70 : false} 
          icon="favorite" 
          color="bg-accent" 
        />
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* Sentiment Analysis */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-800">Live Sentiment Analysis</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {sentiments.map((item) => (
              <div key={item.label} className={`flex flex-col items-center justify-center p-6 ${item.bg} rounded-2xl transition-all hover:scale-105 duration-300`}>
                <div className="relative size-24 mb-4">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className={item.color} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${item.value}, 100`} strokeWidth="3" strokeLinecap="round"></path>
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">{item.emoji}</div>
                </div>
                <p className="text-3xl font-black text-slate-800">{item.value}%</p>
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Alerts */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-accent/20 flex flex-col">
          <div className="px-6 py-4 bg-accent/5 border-b border-accent/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent font-black">
              <span className="material-symbols-outlined animate-pulse fill-1">error</span>
              <h3>Live Alerts</h3>
            </div>
            <span className="bg-accent text-white text-[10px] font-black px-2 py-1 rounded-full">
              {alerts.length} {alerts.length === 1 ? 'ALERT' : 'ALERTS'}
            </span>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                <p className="text-sm font-medium">No active alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className={`${getAlertColor(alert.severity)} p-2.5 rounded-xl shrink-0 shadow-sm`}>
                    <span className="material-symbols-outlined text-xl">{getAlertIcon(alert.alert_type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-black text-slate-800 truncate">{alert.title}</p>
                      <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                        {formatRelativeTime(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">{alert.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
