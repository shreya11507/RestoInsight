# RestoInsight - Emotion Detection Model

## Step-by-Step Setup Instructions

### Prerequisites
- Python 3.9 or 3.10 (recommended)
- A video file with people's faces for testing

---

## 🚀 STEP 1: Create Python Virtual Environment

Open **Command Prompt** or **PowerShell** and run:

```bash
# Navigate to the model folder
cd "C:\Users\rekha\OneDrive\Shreya Projects\restoinsight\model"

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate
```

You should see `(venv)` at the start of your command line.

---

## 🚀 STEP 2: Install Dependencies

With the virtual environment activated:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

⏳ This will take 5-10 minutes (downloads TensorFlow and other models).

**Note:** `face_recognition` requires Visual Studio Build Tools on Windows.
If it fails, install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

---

## 🚀 STEP 3: Add Staff Photos (Optional)

To enable staff recognition:

1. Add photos to `model/staff_faces/` folder
2. Name format: `firstname.jpg` (e.g., `sarah.jpg`, `john.jpg`)
3. Use clear front-facing photos

---

## 🚀 STEP 4: Run the Model

```bash
python emotion_detector_v2.py
```

---

## 🚀 STEP 5: Select Video & Watch

1. A file dialog will open
2. Select any video file (.mp4, .avi, .mov, .mkv)
3. Watch the processing with:
   - Bounding boxes around faces
   - Person tracking IDs (Guest #1, Guest #2, etc.)
   - Staff recognition (if photos added)
   - Real-time emotion labels
4. Press **Q** to stop early

---

## 🚀 STEP 6: Check Results

After processing, check `output_data.json` in the model folder.

---

## 📁 Output Data Format (Matches Your Schema)

```json
{
  "emotion_snapshots": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "person_type": "guest",
      "staff_id": null,
      "person_id": 1,
      "emotion": "happy",
      "confidence": 0.92,
      "bounding_box": {"x": 120, "y": 80, "w": 60, "h": 80},
      "captured_at": "2025-12-30T13:30:00"
    }
  ],
  "session_sentiment": [
    {
      "session_id": "uuid",
      "person_type": "guest",
      "avg_happiness": 75,
      "dominant_emotion": "happy",
      "emotion_trend": "stable",
      "snapshot_count": 15
    }
  ],
  "staff_performance": [
    {
      "staff_id": "uuid",
      "customer_sentiment_avg": 4.2,
      "badge": "High Empathy"
    }
  ],
  "tracked_persons": {
    "total_unique": 5,
    "guests": 4,
    "staff": 1
  },
  "alerts": [...],
  "realtime_metrics": {...}
}
```

---

## ✨ New Features in v2.0

| Feature | Description |
|---------|-------------|
| **Person Tracking** | Each person gets a unique ID tracked across frames |
| **Staff Recognition** | Recognizes known staff from photos in `staff_faces/` |
| **Separate Sessions** | Each person gets their own session_id for sentiment analysis |
| **Staff Performance** | Calculates emotion metrics for staff members |
| **Guest vs Staff** | Distinguishes between guests and staff in metrics |

---

## ❓ Troubleshooting

### "No module named 'face_recognition'"
This is optional. The model will work without it (staff recognition disabled).
To install: `pip install face_recognition`

### "error: Microsoft Visual C++ 14.0 or greater is required"
Install Visual Studio Build Tools from:
https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Video window doesn't appear
Press Alt+Tab to find it, or check if video file is valid.

---

## 🔄 Next Steps

1. Test with video containing multiple people
2. Add staff photos to enable recognition
3. Integrate with Firebase for data storage
4. Add Gemini API for anomaly analysis
5. Connect to your React frontend
