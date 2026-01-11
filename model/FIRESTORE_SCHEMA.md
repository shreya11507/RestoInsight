# Firestore Setup & Collection Structure for RestoInsight

## 🚀 Quick Setup Guide

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** → Name it `restoinsight`
3. Disable Google Analytics (optional)
4. Click **Create Project**

### Step 2: Enable Firestore
1. In Firebase Console → **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"**
4. Select region: `asia-south1` (Mumbai) or nearest
5. Click **Enable**

### Step 3: Get Frontend Config
1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click **Web** (`</>`)
3. Register app name: `restoinsight-web`
4. Copy the config and update `firebase.ts`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 4: Get Python Service Account
1. Go to **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Save as `model/firebase-service-account.json`

### Step 5: Install Dependencies
```bash
# Frontend
npm install firebase

# Python model
pip install firebase-admin
```

### Step 6: Deploy Firestore Rules
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 📁 Collections Overview

```
firestore/
├── realtime_metrics/          # Single document - live dashboard data
├── tables/                    # Per-table session data
├── emotion_snapshots/         # All individual detections
├── alerts/                    # Anomalies (sent to Gemini)
├── staff/                     # Staff profiles
├── staff_performance/         # Daily staff scores
└── daily_analytics/           # Historical rollups
```

---

## 📄 Collection: `realtime_metrics`

**Document ID:** `current` (single document, updated live)

```javascript
{
  guests_inside: 5,              // Current guests in restaurant
  total_walkins: 42,             // Today's total walk-ins
  avg_table_time: 45.5,          // Minutes
  service_score: 85,             // 0-100%
  
  // Sentiment breakdown (guests only)
  happy_pct: 65,
  neutral_pct: 20,
  confused_pct: 10,
  angry_pct: 5,
  
  // Current vibe score
  current_vibe: 78,
  
  updated_at: Timestamp
}
```

**Frontend Use:** Dashboard stats, Live Sentiment Analysis pie chart

---

## 📄 Collection: `tables`

**Document ID:** Auto-generated

```javascript
{
  id: "uuid",
  table_number: "05",
  status: "Engaged",              // Free, Engaged, Waiting, Bill Needed, Cleaning
  
  // Current session
  guests: ["guest_1", "guest_2"],
  staff: ["Oviya", "Somu"],
  guest_count: 2,
  
  // Timing
  start_time: Timestamp,
  end_time: Timestamp,
  time_in_status: 1245,           // Seconds
  
  // Sentiment summary
  guest_sentiment: {
    avg_happiness: 75,
    dominant_emotion: "happy",
    trend: "stable",              // improving, stable, deteriorating
    emotion_breakdown: {
      happy: 8,
      neutral: 3,
      angry: 1
    }
  },
  
  staff_sentiment: {
    avg_happiness: 80,
    dominant_emotion: "happy",
    trend: "stable"
  },
  
  // Linked anomalies
  anomalies: ["alert_id_1"],
  
  created_at: Timestamp
}
```

**Frontend Use:** Live Monitoring floor status, Guest Insights timeline

---

## 📄 Collection: `emotion_snapshots`

**Document ID:** Auto-generated

```javascript
{
  id: "uuid",
  table_number: 5,
  person_type: "guest",           // guest or staff
  person_name: "Guest" or "Oviya",
  
  emotion: "happy",
  confidence: 0.92,
  
  bounding_box: {
    x: 120,
    y: 80,
    w: 60,
    h: 80
  },
  
  captured_at: Timestamp
}
```

**Frontend Use:** Live bounding box overlay, historical analysis

---

## 📄 Collection: `alerts`

**Document ID:** Auto-generated

```javascript
{
  id: "uuid",
  table_number: 2,
  
  alert_type: "dispute_staff_customer",
  // Types: dispute_staff_customer, dispute_customers, 
  //        negative_experience, guest_angry, deteriorating_mood
  
  severity: "urgent",             // urgent, warning, info
  title: "Table 02: Staff-Customer Dispute",
  description: "Both staff and customer showing anger...",
  
  // Gemini fills these
  root_cause: "Long wait time led to frustrated customer...",
  ai_recommendation: "Send manager with complimentary appetizer...",
  gemini_analysis: { ... },       // Full Gemini response
  
  is_resolved: false,
  resolved_at: null,
  resolved_by: null,
  
  created_at: Timestamp
}
```

**Frontend Use:** Dashboard Live Alerts, Anomaly Center

---

## 📄 Collection: `staff`

**Document ID:** Staff name (e.g., "Oviya")

```javascript
{
  id: "uuid",
  name: "Oviya",
  photo_url: "gs://bucket/staff/oviya.png",
  is_active: true,
  created_at: Timestamp
}
```

**Frontend Use:** Team Analytics staff list

---

## 📄 Collection: `staff_performance`

**Document ID:** `{staff_name}_{date}` (e.g., "Oviya_2025-12-30")

```javascript
{
  id: "uuid",
  name: "Oviya",
  date: "2025-12-30",
  
  // Scores
  score: 85.5,                    // 0-100
  rank: 1,
  
  // Classification
  badge: "High Empathy",          // High Empathy, Consistent, Needs Support
  category: "top_performer",      // top_performer, most_praised, needs_support
  
  // Details
  emotion_count: 24,
  dominant_emotion: "happy",
  
  // For radar chart
  speed_score: 4.2,               // 0-5 (calculated from response times)
  friendliness_score: 4.8,        // 0-5 (from happy emotions)
  accuracy_score: 4.0,            // 0-5
  
  created_at: Timestamp
}
```

**Frontend Use:** Team Analytics rankings, Top Performers, Team Balance radar

---

## 📄 Collection: `daily_analytics`

**Document ID:** Date string (e.g., "2025-12-30")

```javascript
{
  date: "2025-12-30",
  
  total_guests: 128,
  total_tables: 45,
  avg_table_time: 48,             // Minutes
  
  // Sentiment
  avg_sentiment: 78,              // 0-100
  positive_count: 89,
  negative_count: 15,
  neutral_count: 24,
  
  // Issues breakdown
  guests_at_risk: 12,
  wait_time_issues: 8,
  service_issues: 4,
  
  // Alerts summary
  total_alerts: 5,
  urgent_alerts: 2,
  resolved_alerts: 4,
  
  created_at: Timestamp
}
```

**Frontend Use:** Emotional KPIs weekly charts

---

## 🔄 Data Flow

```
Model Detects Emotion
        ↓
  ┌─────┴─────┐
  │           │
Normal    Anomaly
  │           │
  ↓           ↓
Firestore   Gemini API
  │           │
  │      Get insights
  │           │
  │           ↓
  │      Firestore
  │      (alerts with
  │       AI recommendation)
  │           │
  └─────┬─────┘
        ↓
   Frontend fetches
   via Firebase SDK
```

---

## 📱 Frontend → Firestore Queries

### Dashboard
```javascript
// Realtime metrics
db.collection('realtime_metrics').doc('current').onSnapshot(...)

// Live alerts
db.collection('alerts')
  .where('is_resolved', '==', false)
  .orderBy('created_at', 'desc')
  .limit(5)
  .onSnapshot(...)
```

### Live Monitoring
```javascript
// Table status
db.collection('tables')
  .where('status', '!=', 'completed')
  .onSnapshot(...)

// Mood timeline (last hour snapshots)
db.collection('emotion_snapshots')
  .where('captured_at', '>', oneHourAgo)
  .orderBy('captured_at')
  .onSnapshot(...)
```

### Team Analytics
```javascript
// Staff performance today
db.collection('staff_performance')
  .where('date', '==', today)
  .orderBy('rank')
  .get()
```

### Anomaly Center
```javascript
// All alerts
db.collection('alerts')
  .orderBy('created_at', 'desc')
  .get()

// Unresolved only
db.collection('alerts')
  .where('is_resolved', '==', false)
  .orderBy('severity')
  .get()
```

### Guest Insights
```javascript
// Specific table session
db.collection('tables')
  .doc(tableId)
  .get()

// Session timeline
db.collection('emotion_snapshots')
  .where('table_number', '==', tableNum)
  .orderBy('captured_at')
  .get()
```

### Emotional KPIs
```javascript
// Weekly data
db.collection('daily_analytics')
  .where('date', '>=', weekAgo)
  .orderBy('date')
  .get()
```

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read for authenticated users
    match /{collection}/{document=**} {
      allow read: if request.auth != null;
    }
    
    // Allow write only from backend/model
    match /emotion_snapshots/{doc} {
      allow write: if request.auth != null;
    }
    
    match /alerts/{doc} {
      allow write: if request.auth != null;
      // Allow frontend to mark resolved
      allow update: if request.auth != null 
        && request.resource.data.keys().hasOnly(['is_resolved', 'resolved_at', 'resolved_by']);
    }
    
    match /realtime_metrics/{doc} {
      allow write: if request.auth != null;
    }
  }
}
```
