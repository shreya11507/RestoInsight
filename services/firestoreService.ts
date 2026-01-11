/**
 * Firestore Service - Frontend Data Fetching
 * 
 * Provides real-time listeners and queries for all dashboard pages:
 * - Dashboard
 * - Anomaly Center  
 * - Live Floor (Live Monitoring)
 * - Team Pulse (Team Analytics)
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  updateDoc,
  Timestamp,
  Unsubscribe,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================
// TYPES
// ============================================

export interface RealtimeMetrics {
  guests_inside: number;
  total_walkins: number;
  avg_table_time: number;
  service_score: number;
  happy_pct: number;
  neutral_pct: number;
  confused_pct: number;
  angry_pct: number;
  current_vibe: number;
  updated_at: Timestamp;
}

export interface TableData {
  id: string;
  table_number: string;
  status: 'Free' | 'Engaged' | 'Waiting' | 'Bill Needed' | 'Cleaning';
  guests: string[];
  staff: string[];
  guest_count: number;
  start_time: Timestamp;
  end_time: Timestamp | null;
  time_in_status: number;
  guest_sentiment: {
    avg_happiness: number;
    dominant_emotion: string;
    trend: 'improving' | 'stable' | 'deteriorating';
    emotion_breakdown: Record<string, number>;
  };
  staff_sentiment: {
    avg_happiness: number;
    dominant_emotion: string;
    trend: 'improving' | 'stable' | 'deteriorating';
  };
  anomalies: string[];
  created_at: Timestamp;
}

export interface Alert {
  id: string;
  table_number: number;
  alert_type: 'dispute_staff_customer' | 'dispute_customers' | 'service_dissatisfaction' | 'negative_experience';
  severity: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  root_cause?: string;
  ai_recommendation?: string;
  is_resolved: boolean;
  resolved_at: Timestamp | null;
  resolved_by: string | null;
  created_at: Timestamp;
}

export interface StaffPerformance {
  id: string;
  name: string;
  date: string;
  score: number;
  rank: number;
  badge: 'High Empathy' | 'Consistent' | 'Needs Support';
  category: 'top_performer' | 'most_praised' | 'needs_support';
  detection_count: number;
  dominant_emotion: string;
  tables_served: number;
  resolved_negative_trends: number;
  created_at: Timestamp;
}

export interface EmotionSnapshot {
  id: string;
  table_number: number;
  person_type: 'guest' | 'staff';
  person_name: string;
  emotion: string;
  confidence: number;
  bounding_box: { x: number; y: number; w: number; h: number };
  captured_at: Timestamp;
}

// ============================================
// DASHBOARD SERVICES
// ============================================

/**
 * Subscribe to realtime metrics (Dashboard stats)
 */
export function subscribeToRealtimeMetrics(
  callback: (data: RealtimeMetrics | null) => void
): Unsubscribe {
  const docRef = doc(db, 'realtime_metrics', 'current');
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RealtimeMetrics);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error fetching realtime metrics:', error);
    callback(null);
  });
}

/**
 * Subscribe to live alerts (Dashboard & Anomaly Center)
 */
export function subscribeToLiveAlerts(
  onlyUnresolved: boolean,
  callback: (alerts: Alert[]) => void,
  limitCount: number = 10
): Unsubscribe {
  let q = query(
    collection(db, 'alerts'),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  
  if (onlyUnresolved) {
    q = query(
      collection(db, 'alerts'),
      where('is_resolved', '==', false),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const alerts: Alert[] = [];
    snapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() } as Alert);
    });
    callback(alerts);
  }, (error) => {
    console.error('Error fetching alerts:', error);
    callback([]);
  });
}

// ============================================
// LIVE MONITORING SERVICES
// ============================================

/**
 * Subscribe to table status (Live Floor)
 */
export function subscribeToTables(
  callback: (tables: TableData[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'tables'),
    orderBy('table_number')
  );
  
  return onSnapshot(q, (snapshot) => {
    const tables: TableData[] = [];
    snapshot.forEach((doc) => {
      tables.push({ id: doc.id, ...doc.data() } as TableData);
    });
    callback(tables);
  }, (error) => {
    console.error('Error fetching tables:', error);
    callback([]);
  });
}

/**
 * Subscribe to recent emotion snapshots (Mood Timeline)
 */
export function subscribeToRecentSnapshots(
  callback: (snapshots: EmotionSnapshot[]) => void,
  hoursBack: number = 1
): Unsubscribe {
  const cutoffTime = Timestamp.fromDate(
    new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  );
  
  const q = query(
    collection(db, 'emotion_snapshots'),
    where('captured_at', '>', cutoffTime),
    orderBy('captured_at', 'desc'),
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    const snapshots: EmotionSnapshot[] = [];
    snapshot.forEach((doc) => {
      snapshots.push({ id: doc.id, ...doc.data() } as EmotionSnapshot);
    });
    callback(snapshots);
  }, (error) => {
    console.error('Error fetching snapshots:', error);
    callback([]);
  });
}

// ============================================
// TEAM ANALYTICS SERVICES
// ============================================

/**
 * Get staff performance for a specific date
 */
export async function getStaffPerformance(
  date: string
): Promise<StaffPerformance[]> {
  const q = query(
    collection(db, 'staff_performance'),
    where('date', '==', date),
    orderBy('rank')
  );
  
  const snapshot = await getDocs(q);
  const performance: StaffPerformance[] = [];
  
  snapshot.forEach((doc) => {
    performance.push({ id: doc.id, ...doc.data() } as StaffPerformance);
  });
  
  return performance;
}

/**
 * Subscribe to staff performance (realtime updates)
 */
export function subscribeToStaffPerformance(
  date: string,
  callback: (performance: StaffPerformance[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'staff_performance'),
    where('date', '==', date),
    orderBy('rank')
  );
  
  return onSnapshot(q, (snapshot) => {
    const performance: StaffPerformance[] = [];
    snapshot.forEach((doc) => {
      performance.push({ id: doc.id, ...doc.data() } as StaffPerformance);
    });
    callback(performance);
  }, (error) => {
    console.error('Error fetching staff performance:', error);
    callback([]);
  });
}

// ============================================
// ANOMALY CENTER SERVICES
// ============================================

/**
 * Get all alerts with optional filters
 */
export async function getAlerts(
  resolved?: boolean
): Promise<Alert[]> {
  let q;
  
  if (resolved !== undefined) {
    q = query(
      collection(db, 'alerts'),
      where('is_resolved', '==', resolved),
      orderBy('created_at', 'desc')
    );
  } else {
    q = query(
      collection(db, 'alerts'),
      orderBy('created_at', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  const alerts: Alert[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as DocumentData;
    alerts.push({ 
      id: docSnap.id, 
      table_number: data.table_number,
      alert_type: data.alert_type,
      severity: data.severity,
      title: data.title,
      description: data.description,
      root_cause: data.root_cause,
      ai_recommendation: data.ai_recommendation,
      is_resolved: data.is_resolved,
      resolved_at: data.resolved_at,
      resolved_by: data.resolved_by,
      created_at: data.created_at
    } as Alert);
  });
  
  return alerts;
}

/**
 * Mark an alert as resolved
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string = 'Manager'
): Promise<void> {
  const alertRef = doc(db, 'alerts', alertId);
  
  await updateDoc(alertRef, {
    is_resolved: true,
    resolved_at: Timestamp.now(),
    resolved_by: resolvedBy
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format timestamp to relative time (e.g., "2m ago")
 */
export function formatRelativeTime(timestamp: Timestamp): string {
  const now = Date.now();
  const diff = now - timestamp.toMillis();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return timestamp.toDate().toLocaleDateString();
}
