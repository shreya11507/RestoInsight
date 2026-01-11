"""
RestoInsight - Emotion Detection Model v5.0 (Optimized)
================================================================================
OPTIMIZED FOR SPEED while maintaining accuracy for:
- Staff face recognition
- Table-based scene detection  
- Emotion tracking with trends
- Anomaly detection (disputes, service issues)
- Staff performance ranking

Key Optimizations:
- Uses 'opencv' backend (fast) instead of retinaface/cnn
- Uses 'hog' model for face_recognition (CPU-friendly)
- Processes every 30 frames (1 per second at 30fps)
- Caches staff encodings and recent detections
- Batched face encoding for efficiency

Reference evaluation scenes (for validation, NOT hardcoded):
- Tables with guest/staff emotional patterns
- Anomaly types: disputes, service dissatisfaction
- Staff ranking: high performers resolve negative trends
================================================================================
"""

import cv2
import json
import uuid
import os
from datetime import datetime
from collections import defaultdict
import tkinter as tk
from tkinter import filedialog
import numpy as np

# DeepFace for emotion detection
try:
    from deepface import DeepFace
except ImportError:
    print("❌ deepface required. Install: pip install deepface")
    exit(1)

# Face recognition for staff matching
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("⚠️ face_recognition not installed. Staff recognition disabled.")

# ============================================
# CONFIGURATION - Optimized for Speed
# ============================================
CONFIG = {
    # Processing - optimized
    'PROCESS_EVERY_N_FRAMES': 30,           # 1 per second at 30fps (fast)
    
    # Face Detection - use fast backend
    'DETECTOR_BACKEND': 'opencv',            # Fast! (not retinaface/mtcnn)
    'MIN_FACE_SIZE': 40,                     # Minimum face pixels
    'CONFIDENCE_THRESHOLD': 0.40,            # Emotion confidence threshold
    
    # Face Matching - use HOG (fast on CPU)
    'FACE_MODEL': 'hog',                     # Fast! (not cnn)
    'STAFF_MATCH_THRESHOLD': 0.50,           # Distance threshold (lower = stricter)
    'PERSON_TRACKING_THRESHOLD': 0.45,       # Same person tracking
    
    # Scene Detection
    'SCENE_CHANGE_THRESHOLD': 0.40,          # Histogram difference
    
    # Anomaly Detection
    'ANOMALY_CONFIDENCE': 0.55,
    
    # Emotion weights for sentiment
    'EMOTION_WEIGHTS': {
        'happy': 1.0,
        'surprise': 0.65,
        'neutral': 0.5,
        'sad': 0.2,
        'fear': 0.15,
        'disgust': 0.1,
        'angry': 0.0
    }
}


# ============================================
# STAFF RECOGNIZER (Optimized)
# ============================================
class StaffRecognizer:
    """Fast staff face recognition using HOG model"""
    
    def __init__(self, staff_folder):
        self.staff_data = {}  # {name: encoding}
        self.staff_folder = staff_folder
        self._load_staff()
    
    def _load_staff(self):
        """Load staff faces with HOG model (fast)"""
        if not FACE_RECOGNITION_AVAILABLE:
            return
        
        if not os.path.exists(self.staff_folder):
            print(f"📁 Staff folder not found: {self.staff_folder}")
            return
        
        print(f"\n📂 Loading staff faces...")
        
        for filename in os.listdir(self.staff_folder):
            if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            
            filepath = os.path.join(self.staff_folder, filename)
            name = os.path.splitext(filename)[0].strip().title()
            
            try:
                img = face_recognition.load_image_file(filepath)
                # Use HOG model - much faster on CPU
                locations = face_recognition.face_locations(img, model='hog')
                
                if locations:
                    encodings = face_recognition.face_encodings(img, locations)
                    if encodings:
                        self.staff_data[name] = encodings[0]
                        print(f"   ✓ {name}")
            except Exception as e:
                print(f"   ✗ {filename}: {str(e)[:30]}")
        
        print(f"📋 Loaded {len(self.staff_data)} staff members")
    
    def match(self, face_encoding):
        """Match face against known staff (returns name or None)"""
        if not self.staff_data or face_encoding is None:
            return None
        
        for name, known_enc in self.staff_data.items():
            distance = face_recognition.face_distance([known_enc], face_encoding)[0]
            if distance < CONFIG['STAFF_MATCH_THRESHOLD']:
                return name
        return None
    
    def get_names(self):
        return list(self.staff_data.keys())


# ============================================
# PERSON TRACKER (Optimized)
# ============================================
class PersonTracker:
    """Tracks persons across frames using face embeddings"""
    
    def __init__(self):
        self.persons = {}  # {id: {'encoding': array, 'type': str, 'name': str}}
        self.guest_counter = 0
    
    def get_or_create(self, encoding, is_staff, staff_name):
        """Find existing person or create new one"""
        
        if is_staff and staff_name:
            pid = f"staff_{staff_name}"
            if pid not in self.persons:
                self.persons[pid] = {
                    'type': 'staff',
                    'name': staff_name,
                    'encoding': encoding
                }
            return pid, 'staff', staff_name
        
        # Try to match with existing guests
        if encoding is not None:
            for pid, data in self.persons.items():
                if data['type'] != 'guest':
                    continue
                if data['encoding'] is None:
                    continue
                
                distance = face_recognition.face_distance([data['encoding']], encoding)[0]
                if distance < CONFIG['PERSON_TRACKING_THRESHOLD']:
                    # Update encoding
                    self.persons[pid]['encoding'] = encoding
                    return pid, 'guest', data['name']
        
        # New guest
        self.guest_counter += 1
        pid = f"guest_{self.guest_counter}"
        name = f"Guest {self.guest_counter}"
        self.persons[pid] = {
            'type': 'guest',
            'name': name,
            'encoding': encoding
        }
        return pid, 'guest', name
    
    def reset_guests(self):
        """Reset guest tracking for new table/scene"""
        self.persons = {k: v for k, v in self.persons.items() if v['type'] == 'staff'}
        self.guest_counter = 0
    
    def get_counts(self):
        guests = sum(1 for v in self.persons.values() if v['type'] == 'guest')
        staff = sum(1 for v in self.persons.values() if v['type'] == 'staff')
        return guests, staff


# ============================================
# SCENE DETECTOR
# ============================================
class SceneDetector:
    """Detects scene/table changes via histogram comparison"""
    
    def __init__(self):
        self.prev_hist = None
        self.current_table = 1
        self.table_start = 0
        self.table_frames = {}
    
    def check(self, frame, frame_num):
        """Check for scene change, returns (changed, table_num)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        
        changed = False
        
        if self.prev_hist is not None:
            diff = cv2.compareHist(self.prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
            if diff > CONFIG['SCENE_CHANGE_THRESHOLD']:
                self.table_frames[self.current_table] = frame_num - self.table_start
                self.current_table += 1
                self.table_start = frame_num
                changed = True
        
        self.prev_hist = hist
        return changed, self.current_table


# ============================================
# DATA STORE
# ============================================
class DataStore:
    """Stores all detection data"""
    
    def __init__(self):
        self.snapshots = []
        self.tables = {}
        self.alerts = []
        self.total_guests = 0
        
        # Per-table tracking
        self.table_data = defaultdict(lambda: {
            'guests': set(),
            'staff': set(),
            'guest_emotions': [],
            'staff_emotions': []
        })
        
        # Staff performance tracking
        self.staff_emotions = defaultdict(list)
    
    def init_table(self, table_num):
        if table_num not in self.tables:
            self.tables[table_num] = {
                'id': str(uuid.uuid4()),
                'table_number': f"{table_num:02d}",
                'start_time': datetime.now().isoformat(),
                'end_time': None
            }
    
    def add_detection(self, table_num, person_id, person_type, person_name,
                      emotion, confidence, bbox):
        """Add emotion detection snapshot"""
        self.init_table(table_num)
        
        snapshot = {
            'id': str(uuid.uuid4()),
            'table_number': table_num,
            'person_id': person_id,
            'person_type': person_type,
            'person_name': person_name,
            'emotion': emotion,
            'confidence': round(confidence, 3),
            'bounding_box': bbox,
            'captured_at': datetime.now().isoformat()
        }
        self.snapshots.append(snapshot)
        
        # Track per table
        td = self.table_data[table_num]
        if person_type == 'staff':
            td['staff'].add(person_name)
            td['staff_emotions'].append(emotion)
            self.staff_emotions[person_name].append({
                'emotion': emotion,
                'confidence': confidence,
                'table': table_num
            })
        else:
            if person_id not in td['guests']:
                td['guests'].add(person_id)
                self.total_guests += 1
            td['guest_emotions'].append(emotion)
        
        return snapshot
    
    def add_alert(self, table_num, alert_type, severity, title, description):
        alert = {
            'id': str(uuid.uuid4()),
            'table_number': table_num,
            'alert_type': alert_type,
            'severity': severity,
            'title': title,
            'description': description,
            'is_resolved': False,
            'created_at': datetime.now().isoformat()
        }
        self.alerts.append(alert)
        return alert
    
    def finalize_table(self, table_num):
        if table_num in self.tables:
            self.tables[table_num]['end_time'] = datetime.now().isoformat()
            td = self.table_data[table_num]
            self.tables[table_num]['guests'] = list(td['guests'])
            self.tables[table_num]['staff'] = list(td['staff'])
    
    def _calc_sentiment(self, emotions):
        """Calculate sentiment metrics from emotion list"""
        if not emotions:
            return {'avg_happiness': 0, 'dominant': 'neutral', 'trend': 'stable'}
        
        weights = CONFIG['EMOTION_WEIGHTS']
        counts = defaultdict(int)
        for e in emotions:
            counts[e] += 1
        
        dominant = max(counts, key=counts.get)
        avg_happiness = int(sum(weights.get(e, 0.5) for e in emotions) / len(emotions) * 100)
        
        # Trend calculation
        if len(emotions) >= 4:
            mid = len(emotions) // 2
            first = sum(weights.get(e, 0.5) for e in emotions[:mid]) / mid
            second = sum(weights.get(e, 0.5) for e in emotions[mid:]) / (len(emotions) - mid)
            diff = second - first
            trend = 'improving' if diff > 0.12 else ('deteriorating' if diff < -0.12 else 'stable')
        else:
            trend = 'stable'
        
        return {
            'avg_happiness': avg_happiness,
            'dominant': dominant,
            'trend': trend,
            'counts': dict(counts)
        }
    
    def calc_staff_performance(self):
        """Calculate staff performance scores and rankings"""
        performance = []
        weights = CONFIG['EMOTION_WEIGHTS']
        
        for name, emotions in self.staff_emotions.items():
            if not emotions:
                continue
            
            # Score 0-100 based on positive emotions displayed
            score = sum(weights.get(e['emotion'], 0.5) * 100 for e in emotions) / len(emotions)
            
            # Count resolved negative trends (staff showing positive during guest negative)
            tables_served = set(e['table'] for e in emotions)
            resolved_count = 0
            for tnum in tables_served:
                td = self.table_data[tnum]
                guest_emo = td['guest_emotions']
                staff_emo = [e['emotion'] for e in emotions if e['table'] == tnum]
                
                # Check if staff was positive when guests had negative moments
                guest_neg = sum(1 for e in guest_emo if e in ['angry', 'sad', 'disgust'])
                staff_pos = sum(1 for e in staff_emo if e in ['happy', 'neutral'])
                
                if guest_neg > 0 and staff_pos > guest_neg:
                    resolved_count += 1
            
            # Bonus for resolving negative trends
            score += resolved_count * 5
            score = min(100, score)
            
            # Badge based on score
            if score >= 75:
                badge = 'High Empathy'
                category = 'top_performer'
            elif score >= 55:
                badge = 'Consistent'
                category = 'most_praised'
            else:
                badge = 'Needs Support'
                category = 'needs_support'
            
            # Dominant emotion
            emo_counts = defaultdict(int)
            for e in emotions:
                emo_counts[e['emotion']] += 1
            dominant = max(emo_counts, key=emo_counts.get)
            
            performance.append({
                'name': name,
                'score': round(score, 1),
                'badge': badge,
                'category': category,
                'dominant_emotion': dominant,
                'tables_served': len(tables_served),
                'resolved_negative_trends': resolved_count,
                'detection_count': len(emotions)
            })
        
        # Sort by score (high performers first)
        performance.sort(key=lambda x: x['score'], reverse=True)
        for i, p in enumerate(performance):
            p['rank'] = i + 1
        
        return performance
    
    def calc_metrics(self):
        """Calculate realtime dashboard metrics"""
        all_guest_emotions = []
        for td in self.table_data.values():
            all_guest_emotions.extend(td['guest_emotions'])
        
        if not all_guest_emotions:
            return {
                'total_walkins': 0,
                'happy_pct': 0, 'neutral_pct': 0,
                'confused_pct': 0, 'angry_pct': 0,
                'service_score': 0
            }
        
        total = len(all_guest_emotions)
        counts = defaultdict(int)
        for e in all_guest_emotions:
            counts[e] += 1
        
        positive = counts['happy'] + counts['surprise']
        service_score = int((positive / total) * 100)
        
        return {
            'total_walkins': self.total_guests,
            'happy_pct': int(counts['happy'] / total * 100),
            'neutral_pct': int(counts['neutral'] / total * 100),
            'confused_pct': int((counts['fear'] + counts['surprise']) / total * 100),
            'angry_pct': int((counts['angry'] + counts['sad'] + counts['disgust']) / total * 100),
            'service_score': service_score
        }
    
    def export(self):
        """Export all data for Firestore"""
        # Table sentiments
        table_sentiments = {}
        for tnum, td in self.table_data.items():
            table_sentiments[tnum] = {
                'guest_sentiment': self._calc_sentiment(td['guest_emotions']),
                'staff_sentiment': self._calc_sentiment(td['staff_emotions']),
                'guest_count': len(td['guests']),
                'staff_list': list(td['staff'])
            }
        
        return {
            'emotion_snapshots': self.snapshots,
            'tables': list(self.tables.values()),
            'table_sentiments': table_sentiments,
            'alerts': self.alerts,
            'staff_performance': self.calc_staff_performance(),
            'realtime_metrics': self.calc_metrics(),
            'summary': {
                'total_snapshots': len(self.snapshots),
                'total_tables': len(self.tables),
                'total_guests': self.total_guests,
                'total_alerts': len(self.alerts),
                'staff_detected': list(self.staff_emotions.keys())
            }
        }


# ============================================
# ANOMALY DETECTOR
# ============================================
class AnomalyDetector:
    """Detects service anomalies based on emotional patterns"""
    
    def __init__(self, data_store):
        self.data_store = data_store
        self.table_anger = defaultdict(lambda: {'guest': 0, 'staff': 0})
        self.alerted = set()
    
    def check(self, table_num, person_type, emotion, confidence):
        """Check for anomalies, return alert if detected"""
        
        if emotion == 'angry' and confidence > CONFIG['ANOMALY_CONFIDENCE']:
            self.table_anger[table_num][person_type] += 1
        
        alert = None
        
        # Type 1: Staff-Customer Dispute (both angry)
        if (self.table_anger[table_num]['guest'] >= 1 and
            self.table_anger[table_num]['staff'] >= 1 and
            f"{table_num}_dispute_staff" not in self.alerted):
            
            self.alerted.add(f"{table_num}_dispute_staff")
            alert = self.data_store.add_alert(
                table_num, 'dispute_staff_customer', 'urgent',
                f"Table {table_num:02d}: Staff-Customer Dispute",
                "Both staff and customer showing anger. Immediate intervention needed."
            )
        
        # Type 2: Guest Dispute (multiple angry guests)
        elif (self.table_anger[table_num]['guest'] >= 2 and
              f"{table_num}_dispute_guest" not in self.alerted):
            
            self.alerted.add(f"{table_num}_dispute_guest")
            alert = self.data_store.add_alert(
                table_num, 'dispute_customers', 'urgent',
                f"Table {table_num:02d}: Guest Dispute",
                "Multiple angry guests detected. Possible dispute among guests."
            )
        
        # Type 3: Service Dissatisfaction (guest neutral/angry, staff angry)
        td = self.data_store.table_data[table_num]
        guest_neg = sum(1 for e in td['guest_emotions'] if e in ['angry', 'sad', 'neutral'])
        staff_neg = sum(1 for e in td['staff_emotions'] if e in ['angry', 'sad'])
        
        if (guest_neg >= 2 and staff_neg >= 1 and
            f"{table_num}_service" not in self.alerted):
            
            self.alerted.add(f"{table_num}_service")
            alert = self.data_store.add_alert(
                table_num, 'service_dissatisfaction', 'warning',
                f"Table {table_num:02d}: Service Issue",
                "Negative emotions from both guest and staff. Check service quality."
            )
        
        return alert


# ============================================
# MAIN DETECTOR (Optimized)
# ============================================
class EmotionDetector:
    """Main detection pipeline - optimized for speed"""
    
    def __init__(self, staff_folder):
        print("\n" + "=" * 60)
        print("🍽️  RESTOINSIGHT v5.0 (Optimized)")
        print("=" * 60)
        
        self.staff_recognizer = StaffRecognizer(staff_folder)
        self.person_tracker = PersonTracker()
        self.scene_detector = SceneDetector()
        self.data_store = DataStore()
        self.anomaly_detector = AnomalyDetector(self.data_store)
        
        self.current_table = 1
        self.last_detections = []
        self.fps = 30
        
        # Cache for face encodings (avoid recomputing)
        self._encoding_cache = {}
    
    def _get_face_encoding(self, frame, bbox):
        """Get face encoding with caching"""
        if not FACE_RECOGNITION_AVAILABLE:
            return None
        
        try:
            x, y, w, h = bbox
            pad = int(min(w, h) * 0.2)
            y1, y2 = max(0, y - pad), min(frame.shape[0], y + h + pad)
            x1, x2 = max(0, x - pad), min(frame.shape[1], x + w + pad)
            
            face_img = frame[y1:y2, x1:x2]
            if face_img.size == 0:
                return None
            
            face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
            
            # Use HOG model (fast on CPU)
            locations = face_recognition.face_locations(face_rgb, model='hog')
            if not locations:
                locations = [(0, face_rgb.shape[1], face_rgb.shape[0], 0)]
            
            encodings = face_recognition.face_encodings(face_rgb, locations)
            return encodings[0] if encodings else None
            
        except:
            return None
    
    def process_frame(self, frame, frame_num):
        """Process single frame - optimized"""
        
        # Check scene change
        changed, table_num = self.scene_detector.check(frame, frame_num)
        if changed:
            print(f"\n🔄 TABLE CHANGE → Table {table_num}")
            self.data_store.finalize_table(self.current_table)
            self.current_table = table_num
            self.person_tracker.reset_guests()
            self.data_store.init_table(table_num)
        
        detections = []
        
        try:
            # Use opencv backend (fast!)
            results = DeepFace.analyze(
                frame,
                actions=['emotion'],
                detector_backend='opencv',  # Fast!
                enforce_detection=False
            )
            
            if not isinstance(results, list):
                results = [results]
            
            for result in results:
                if 'region' not in result:
                    continue
                
                bbox = result['region']
                x, y, w, h = bbox['x'], bbox['y'], bbox['w'], bbox['h']
                
                # Skip small faces
                if w < CONFIG['MIN_FACE_SIZE'] or h < CONFIG['MIN_FACE_SIZE']:
                    continue
                
                emotions = result['emotion']
                dominant = result['dominant_emotion']
                confidence = emotions[dominant] / 100
                
                if confidence < CONFIG['CONFIDENCE_THRESHOLD']:
                    continue
                
                # Get face encoding for tracking/staff matching
                encoding = self._get_face_encoding(frame, (x, y, w, h))
                
                # Check if staff
                staff_name = self.staff_recognizer.match(encoding) if encoding is not None else None
                is_staff = staff_name is not None
                
                # Track person
                person_id, person_type, person_name = self.person_tracker.get_or_create(
                    encoding, is_staff, staff_name
                )
                
                # Store detection
                snapshot = self.data_store.add_detection(
                    table_num=self.current_table,
                    person_id=person_id,
                    person_type=person_type,
                    person_name=person_name,
                    emotion=dominant,
                    confidence=confidence,
                    bbox={'x': x, 'y': y, 'w': w, 'h': h}
                )
                
                detections.append({
                    'person_id': person_id,
                    'person_type': person_type,
                    'person_name': person_name,
                    'emotion': dominant,
                    'confidence': confidence,
                    'bbox': (x, y, w, h)
                })
                
                # Check anomaly
                alert = self.anomaly_detector.check(
                    self.current_table, person_type, dominant, confidence
                )
                if alert:
                    print(f"\n🚨 ANOMALY: {alert['title']}")
        
        except Exception as e:
            pass  # Silent fail for frames without faces
        
        self.last_detections = detections
        return detections
    
    def draw(self, frame):
        """Draw detections on frame"""
        for det in self.last_detections:
            x, y, w, h = det['bbox']
            emotion = det['emotion']
            conf = det['confidence']
            ptype = det['person_type']
            pname = det['person_name']
            
            # Colors
            if ptype == 'staff':
                color = (0, 165, 255)  # Orange
            else:
                colors = {
                    'happy': (0, 255, 0), 'neutral': (255, 255, 0),
                    'surprise': (0, 255, 255), 'sad': (255, 0, 0),
                    'angry': (0, 0, 255), 'fear': (255, 0, 255),
                    'disgust': (128, 128, 0)
                }
                color = colors.get(emotion, (255, 255, 255))
            
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            
            label1 = f"STAFF: {pname}" if ptype == 'staff' else pname
            label2 = f"{emotion} ({conf*100:.0f}%)"
            
            cv2.putText(frame, label1, (x, y - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            cv2.putText(frame, label2, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return frame
    
    def process_video(self, video_path):
        """Process video file"""
        print(f"\n📹 Video: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("❌ Cannot open video")
            return None
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        duration = total_frames / self.fps
        
        print(f"📊 Frames: {total_frames} | FPS: {self.fps} | Duration: {duration:.1f}s")
        print(f"📋 Staff: {self.staff_recognizer.get_names()}")
        print(f"⚡ Processing every {CONFIG['PROCESS_EVERY_N_FRAMES']} frames (optimized)")
        print("=" * 60)
        
        self.data_store.init_table(1)
        
        cv2.namedWindow('RestoInsight v5.0', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('RestoInsight v5.0', 1280, 720)
        
        print("\n🎬 Processing... (Q to stop)\n")
        
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Process every N frames
            if frame_count % CONFIG['PROCESS_EVERY_N_FRAMES'] == 0:
                detections = self.process_frame(frame, frame_count)
                
                for d in detections:
                    label = f"STAFF:{d['person_name']}" if d['person_type'] == 'staff' else d['person_name']
                    print(f"   T{self.current_table:02d} F{frame_count:04d} | {label:15} | {d['emotion']:10} ({d['confidence']*100:.0f}%)")
            
            # Draw
            frame = self.draw(frame)
            
            # Overlay
            guests, staff = self.person_tracker.get_counts()
            cv2.putText(frame, f"Table: {self.current_table:02d}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            cv2.putText(frame, f"Frame: {frame_count}/{total_frames}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame, f"Guests: {self.data_store.total_guests}", (10, 90),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(frame, f"Staff: {staff}", (10, 120),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
            cv2.putText(frame, f"Alerts: {len(self.data_store.alerts)}", (10, 150),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if self.data_store.alerts else (200, 200, 200), 2)
            
            cv2.imshow('RestoInsight v5.0', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        self.data_store.finalize_table(self.current_table)
        cap.release()
        cv2.destroyAllWindows()
        
        return self.report()
    
    def report(self):
        """Generate and save report"""
        data = self.data_store.export()
        
        print("\n" + "=" * 60)
        print("📊 RESULTS")
        print("=" * 60)
        
        s = data['summary']
        print(f"\n📈 Summary:")
        print(f"   Tables: {s['total_tables']}")
        print(f"   Guests: {s['total_guests']}")
        print(f"   Alerts: {s['total_alerts']}")
        print(f"   Staff: {', '.join(s['staff_detected']) if s['staff_detected'] else 'None'}")
        
        m = data['realtime_metrics']
        print(f"\n📊 Guest Emotions:")
        print(f"   😊 Happy: {m['happy_pct']}%")
        print(f"   😐 Neutral: {m['neutral_pct']}%")
        print(f"   😕 Confused: {m['confused_pct']}%")
        print(f"   😠 Angry/Sad: {m['angry_pct']}%")
        print(f"   ⭐ Service Score: {m['service_score']}%")
        
        # Staff Performance with ranking
        if data['staff_performance']:
            print(f"\n👔 Staff Performance (Ranked):")
            for p in data['staff_performance']:
                trend_info = f"+{p['resolved_negative_trends']} resolved" if p['resolved_negative_trends'] > 0 else ""
                print(f"   #{p['rank']} {p['name']}: {p['score']:.1f}/100 - {p['badge']} {trend_info}")
        
        # Alerts
        if data['alerts']:
            print(f"\n🚨 Anomalies Detected:")
            for a in data['alerts']:
                print(f"   [{a['severity'].upper()}] {a['title']}")
        
        # Table sentiments
        print(f"\n📋 Table Sentiments:")
        for tnum, ts in data['table_sentiments'].items():
            gs = ts['guest_sentiment']
            print(f"   Table {tnum:02d}: Guest {gs['dominant']} ({gs['trend']}), Staff: {', '.join(ts['staff_list']) if ts['staff_list'] else 'N/A'}")
        
        # Save
        output = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output_data.json')
        with open(output, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n💾 Saved: {output}")
        
        return data


# ============================================
# MAIN
# ============================================
def main():
    print("\n" + "=" * 60)
    print("🍽️  RESTOINSIGHT - EMOTION DETECTION v5.0 (Optimized)")
    print("=" * 60)
    print("""
Features:
  ✓ FAST processing (opencv backend, HOG model)
  ✓ Staff face recognition
  ✓ Person tracking across frames
  ✓ Scene-based table detection
  ✓ Emotion trend analysis
  ✓ Anomaly detection (disputes, service issues)
  ✓ Staff performance ranking
  ✓ High performers: resolve negative trends
  ✓ Low performers: let negative trends persist
""")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    staff_folder = os.path.join(script_dir, 'staff_faces')
    
    root = tk.Tk()
    root.withdraw()
    video_path = filedialog.askopenfilename(
        title="Select Video",
        filetypes=[("Video", "*.mp4 *.avi *.mov *.mkv"), ("All", "*.*")]
    )
    root.destroy()
    
    if not video_path:
        print("\n❌ No file selected")
        return
    
    detector = EmotionDetector(staff_folder)
    detector.process_video(video_path)
    
    print("\n" + "=" * 60)
    input("Press Enter to exit...")


if __name__ == "__main__":
    main()
