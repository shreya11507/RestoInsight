# 🍽️ RestoInsight  
### AI-Powered Restaurant Emotion Analytics

RestoInsight is a real-time emotion analytics platform that helps restaurant owners and managers understand **guest and staff sentiment** using CCTV footage and AI. It detects service issues early and provides actionable insights to improve customer experience.

---

## 📌 Overview

Traditional feedback systems are delayed and miss critical moments.  
RestoInsight analyzes emotions **in real time**, detects anomalies, and suggests quick actions using AI.

---

## ✨ Key Features

- Real-time emotion detection from CCTV  
- Detects emotions: happy, sad, angry, neutral, fear, surprise, disgust  
- AI-based anomaly detection with root-cause analysis  
- Live dashboard with sentiment and service metrics  
- Staff performance tracking and rankings  
- Instant alerts for conflicts, delays, and dissatisfaction  

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite  
- **Database:** Firebase Firestore (Real-time)  
- **Emotion Detection:** DeepFace, OpenCV, face_recognition  
- **AI Insights:** Google Gemini API 

---

## 🧪 Methodology

RestoInsight follows a real-time, AI-driven pipeline to analyze emotions, detect service issues, and generate actionable insights.

### 1. Video Input
- Live CCTV footage is used as the input source.
- Video frames are extracted continuously for processing.

### 2. Face Detection
- Each frame is processed using OpenCV.
- Human faces are detected and isolated for further analysis.

### 3. Emotion Recognition
- Detected faces are analyzed using the DeepFace model.
- Emotions identified include: happy, sad, angry, neutral, fear, surprise, and disgust.
- Each detection is timestamped and tagged as guest or staff.

### 4. Data Storage
- Emotion data is stored in Firebase Firestore in real time.
- Only structured emotion metadata is saved (no images or videos).

### 5. Anomaly Detection
- Emotion trends are continuously monitored.
- Sudden spikes in negative emotions or prolonged dissatisfaction are flagged as anomalies.

### 6. AI Insight Generation
- When an anomaly is detected, contextual data is sent to the Gemini AI API.
- Gemini generates:
  - Root cause of the issue
  - Recommended corrective actions
  - Urgency score (1–10)

### 7. Visualization & Alerts
- The React-based dashboard updates in real time.
- Alerts and insights are displayed instantly for managers and staff.
- Reports can be exported for further analysis.


## 🧩 Use Cases

- **Owner:** Monitor live sentiment and service quality  
- **Manager:** View AI-generated alerts with recommendations  
- **Supervisor:** Track staff performance and engagement  
- **Staff:** Resolve alerts and improve service response  

---
## ▶️ Demo Video
https://drive.google.com/file/d/1qi8F_ROGHNcVCRlDYA-CapRbq95LpWlS/view?usp=sharing

