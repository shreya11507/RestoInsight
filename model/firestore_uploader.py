"""
RestoInsight - Firestore Uploader
=================================
Uploads emotion detection data from the model to Firebase Firestore.
Integrates with Gemini AI for anomaly analysis.

SETUP:
1. Download service account key from Firebase Console:
   Project Settings → Service Accounts → Generate New Private Key
2. Save as 'firebase-service-account.json' in this folder
3. pip install firebase-admin google-generativeai

Usage:
    from firestore_uploader import FirestoreUploader
    
    uploader = FirestoreUploader(gemini_api_key="YOUR_KEY")
    uploader.upload_session(data)  # Upload full session with AI analysis
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin required. Install: pip install firebase-admin")
    exit(1)

# Import Gemini analyzer
try:
    from gemini_analyzer import GeminiAnalyzer
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini analyzer not available. Alerts will be uploaded without AI insights.")


class FirestoreUploader:
    """Handles all Firestore uploads for RestoInsight"""
    
    def __init__(self, credentials_path: str = None, gemini_api_key: str = None):
        """
        Initialize Firebase connection and optionally Gemini AI.
        
        Args:
            credentials_path: Path to service account JSON. 
                            Defaults to 'firebase-service-account.json' in same folder.
            gemini_api_key: Gemini API key for AI analysis of anomalies.
        """
        if credentials_path is None:
            credentials_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                'firebase-service-account.json'
            )
        
        if not os.path.exists(credentials_path):
            raise FileNotFoundError(
                f"❌ Firebase credentials not found at: {credentials_path}\n"
                "Download from: Firebase Console → Project Settings → Service Accounts"
            )
        
        # Initialize Firebase (only once)
        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
        
        self.db = firestore.client()
        print("✅ Connected to Firestore")
        
        # Initialize Gemini if API key provided
        self.gemini = None
        if gemini_api_key and GEMINI_AVAILABLE:
            try:
                self.gemini = GeminiAnalyzer(api_key=gemini_api_key)
            except Exception as e:
                print(f"⚠️ Failed to initialize Gemini: {e}")
        elif gemini_api_key and not GEMINI_AVAILABLE:
            print("⚠️ Gemini API key provided but gemini_analyzer.py not found")
    
    # ========================================
    # REALTIME METRICS
    # ========================================
    
    def update_realtime_metrics(self, metrics: Dict[str, Any]) -> None:
        """
        Update the realtime dashboard metrics (single document).
        
        Args:
            metrics: Dict containing:
                - total_walkins: int
                - happy_pct, neutral_pct, confused_pct, angry_pct: int (0-100)
                - service_score: int (0-100)
                - guests_inside: int (optional)
                - current_vibe: int (optional, 0-100)
        """
        doc_ref = self.db.collection('realtime_metrics').document('current')
        
        data = {
            'guests_inside': metrics.get('guests_inside', metrics.get('total_walkins', 0)),
            'total_walkins': metrics.get('total_walkins', 0),
            'avg_table_time': metrics.get('avg_table_time', 45),
            'service_score': metrics.get('service_score', 0),
            'happy_pct': metrics.get('happy_pct', 0),
            'neutral_pct': metrics.get('neutral_pct', 0),
            'confused_pct': metrics.get('confused_pct', 0),
            'angry_pct': metrics.get('angry_pct', 0),
            'current_vibe': metrics.get('current_vibe', metrics.get('service_score', 50)),
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.set(data, merge=True)
        print(f"📊 Updated realtime metrics: {data['total_walkins']} walk-ins, {data['service_score']}% score")
    
    # ========================================
    # TABLES
    # ========================================
    
    def upload_table(self, table_data: Dict[str, Any]) -> str:
        """
        Upload or update a table session.
        
        Args:
            table_data: Dict containing table info from model output
            
        Returns:
            Document ID of the created/updated table
        """
        # Use table_number as document ID for easy updates
        table_num = str(table_data.get('table_number', '01')).zfill(2)
        doc_ref = self.db.collection('tables').document(f"table_{table_num}")
        
        # Parse timestamps
        start_time = self._parse_timestamp(table_data.get('start_time'))
        end_time = self._parse_timestamp(table_data.get('end_time'))
        
        data = {
            'id': table_data.get('id', doc_ref.id),
            'table_number': table_num,
            'status': self._determine_table_status(table_data),
            'guests': table_data.get('guests', []),
            'staff': table_data.get('staff', []),
            'guest_count': len(table_data.get('guests', [])),
            'start_time': start_time,
            'end_time': end_time,
            'time_in_status': self._calc_time_in_status(start_time),
            'guest_sentiment': table_data.get('guest_sentiment', {
                'avg_happiness': 50,
                'dominant_emotion': 'neutral',
                'trend': 'stable',
                'emotion_breakdown': {}
            }),
            'staff_sentiment': table_data.get('staff_sentiment', {
                'avg_happiness': 50,
                'dominant_emotion': 'neutral',
                'trend': 'stable'
            }),
            'anomalies': table_data.get('anomalies', []),
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.set(data, merge=True)
        print(f"🍽️  Uploaded table {table_num}: {data['guest_count']} guests, {data['status']}")
        return doc_ref.id
    
    def _determine_table_status(self, table_data: Dict) -> str:
        """Determine table status based on data"""
        if table_data.get('end_time'):
            return 'Free'
        if len(table_data.get('guests', [])) == 0:
            return 'Free'
        return 'Engaged'
    
    def _calc_time_in_status(self, start_time) -> int:
        """Calculate seconds in current status"""
        if start_time is None:
            return 0
        try:
            if hasattr(start_time, 'timestamp'):
                start_ts = start_time.timestamp()
            else:
                start_ts = datetime.fromisoformat(str(start_time).replace('Z', '+00:00')).timestamp()
            return int(datetime.now().timestamp() - start_ts)
        except:
            return 0
    
    # ========================================
    # EMOTION SNAPSHOTS
    # ========================================
    
    def upload_snapshot(self, snapshot: Dict[str, Any]) -> str:
        """
        Upload a single emotion detection snapshot.
        
        Args:
            snapshot: Dict containing detection data
            
        Returns:
            Document ID of the created snapshot
        """
        doc_ref = self.db.collection('emotion_snapshots').document()
        
        data = {
            'id': snapshot.get('id', doc_ref.id),
            'table_number': snapshot.get('table_number', 1),
            'person_id': snapshot.get('person_id', ''),
            'person_type': snapshot.get('person_type', 'guest'),
            'person_name': snapshot.get('person_name', 'Unknown'),
            'emotion': snapshot.get('emotion', 'neutral'),
            'confidence': snapshot.get('confidence', 0.5),
            'bounding_box': snapshot.get('bounding_box', {'x': 0, 'y': 0, 'w': 0, 'h': 0}),
            'captured_at': self._parse_timestamp(snapshot.get('captured_at')) or firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.set(data)
        return doc_ref.id
    
    def upload_snapshots_batch(self, snapshots: List[Dict[str, Any]]) -> int:
        """
        Upload multiple snapshots in a batch (more efficient).
        
        Args:
            snapshots: List of snapshot dicts
            
        Returns:
            Number of snapshots uploaded
        """
        batch = self.db.batch()
        count = 0
        
        for snapshot in snapshots:
            doc_ref = self.db.collection('emotion_snapshots').document()
            
            data = {
                'id': snapshot.get('id', doc_ref.id),
                'table_number': snapshot.get('table_number', 1),
                'person_id': snapshot.get('person_id', ''),
                'person_type': snapshot.get('person_type', 'guest'),
                'person_name': snapshot.get('person_name', 'Unknown'),
                'emotion': snapshot.get('emotion', 'neutral'),
                'confidence': snapshot.get('confidence', 0.5),
                'bounding_box': snapshot.get('bounding_box', {'x': 0, 'y': 0, 'w': 0, 'h': 0}),
                'captured_at': self._parse_timestamp(snapshot.get('captured_at')) or firestore.SERVER_TIMESTAMP
            }
            
            batch.set(doc_ref, data)
            count += 1
            
            # Firestore batch limit is 500
            if count % 500 == 0:
                batch.commit()
                batch = self.db.batch()
                print(f"   📸 Uploaded {count} snapshots...")
        
        if count % 500 != 0:
            batch.commit()
        
        print(f"📸 Uploaded {count} emotion snapshots")
        return count
    
    # ========================================
    # ALERTS
    # ========================================
    
    def upload_alert(self, alert: Dict[str, Any]) -> str:
        """
        Upload an anomaly alert (with AI insights if available).
        
        Args:
            alert: Dict containing alert data (may include AI analysis fields)
            
        Returns:
            Document ID of the created alert
        """
        doc_ref = self.db.collection('alerts').document()
        
        data = {
            'id': alert.get('id', doc_ref.id),
            'table_number': alert.get('table_number', 0),
            'alert_type': alert.get('alert_type', 'service_dissatisfaction'),
            'severity': alert.get('severity', 'warning'),
            'title': alert.get('title', 'Alert'),
            'description': alert.get('description', ''),
            'root_cause': alert.get('root_cause', None),
            'ai_recommendation': alert.get('ai_recommendation', None),
            'urgency_score': alert.get('urgency_score', None),
            'is_resolved': alert.get('is_resolved', False),
            'resolved_at': None,
            'resolved_by': None,
            'created_at': self._parse_timestamp(alert.get('created_at')) or firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.set(data)
        
        # Log with AI indicator if insights present
        ai_tag = " 🤖" if data['root_cause'] else ""
        print(f"🚨 Uploaded alert: {data['title']} ({data['severity']}){ai_tag}")
        return doc_ref.id
    
    # ========================================
    # STAFF PERFORMANCE
    # ========================================
    
    def upload_staff_performance(self, performance: List[Dict[str, Any]], date: str = None) -> int:
        """
        Upload staff performance rankings.
        
        Args:
            performance: List of staff performance dicts from model
            date: Date string (YYYY-MM-DD), defaults to today
            
        Returns:
            Number of staff records uploaded
        """
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        batch = self.db.batch()
        count = 0
        
        for staff in performance:
            name = staff.get('name', 'Unknown')
            doc_id = f"{name}_{date}"
            doc_ref = self.db.collection('staff_performance').document(doc_id)
            
            data = {
                'id': doc_id,
                'name': name,
                'date': date,
                'score': staff.get('score', 0),
                'rank': staff.get('rank', 0),
                'badge': staff.get('badge', 'Consistent'),
                'category': staff.get('category', 'most_praised'),
                'detection_count': staff.get('detection_count', 0),
                'dominant_emotion': staff.get('dominant_emotion', 'neutral'),
                'tables_served': staff.get('tables_served', 0),
                'resolved_negative_trends': staff.get('resolved_negative_trends', 0),
                'created_at': firestore.SERVER_TIMESTAMP
            }
            
            batch.set(doc_ref, data, merge=True)
            count += 1
        
        batch.commit()
        print(f"👔 Uploaded {count} staff performance records for {date}")
        return count
    
    # ========================================
    # FULL SESSION UPLOAD
    # ========================================
    
    def upload_session(self, data: Dict[str, Any]) -> Dict[str, int]:
        """
        Upload a complete detection session (all data from output_data.json).
        Anomalies are analyzed by Gemini AI before uploading.
        
        Args:
            data: Full output from emotion_detector.py
            
        Returns:
            Dict with counts of uploaded items
        """
        print("\n" + "=" * 50)
        print("🚀 UPLOADING SESSION TO FIRESTORE")
        print("=" * 50)
        
        counts = {
            'tables': 0,
            'snapshots': 0,
            'alerts': 0,
            'staff': 0
        }
        
        # 1. Upload realtime metrics
        if 'realtime_metrics' in data:
            self.update_realtime_metrics(data['realtime_metrics'])
        
        # 2. Upload tables with sentiments
        if 'tables' in data and 'table_sentiments' in data:
            for table in data['tables']:
                table_num = int(str(table.get('table_number', '01')).lstrip('0') or 1)
                
                # Merge sentiment data
                if table_num in data['table_sentiments']:
                    sentiment = data['table_sentiments'][table_num]
                    table['guest_sentiment'] = sentiment.get('guest_sentiment', {})
                    table['staff_sentiment'] = sentiment.get('staff_sentiment', {})
                    table['staff'] = sentiment.get('staff_list', [])
                
                self.upload_table(table)
                counts['tables'] += 1
        
        # 3. Upload emotion snapshots (batch)
        if 'emotion_snapshots' in data:
            counts['snapshots'] = self.upload_snapshots_batch(data['emotion_snapshots'])
        
        # 4. Upload alerts WITH GEMINI AI ANALYSIS
        if 'alerts' in data:
            alerts = data['alerts']
            emotion_snapshots = data.get('emotion_snapshots', [])
            
            # Analyze with Gemini if available
            if self.gemini and len(alerts) > 0:
                print(f"\n🤖 Analyzing {len(alerts)} alerts with Gemini AI...")
                alerts = self.gemini.analyze_alerts_batch(
                    alerts, 
                    emotion_snapshots=emotion_snapshots,
                    delay_between_calls=4.0  # FREE tier rate limit
                )
                print("✅ AI analysis complete")
            
            # Upload alerts (with or without AI insights)
            for alert in alerts:
                self.upload_alert(alert)
                counts['alerts'] += 1
        
        # 5. Upload staff performance
        if 'staff_performance' in data:
            counts['staff'] = self.upload_staff_performance(data['staff_performance'])
        
        print("\n" + "=" * 50)
        print("✅ UPLOAD COMPLETE")
        print(f"   Tables: {counts['tables']}")
        print(f"   Snapshots: {counts['snapshots']}")
        print(f"   Alerts: {counts['alerts']} (with AI insights)" if self.gemini else f"   Alerts: {counts['alerts']}")
        print(f"   Staff Records: {counts['staff']}")
        print("=" * 50)
        
        return counts
    
    # ========================================
    # UTILITIES
    # ========================================
    
    def _parse_timestamp(self, ts) -> Optional[datetime]:
        """Parse various timestamp formats to datetime"""
        if ts is None:
            return None
        
        if isinstance(ts, datetime):
            return ts
        
        if isinstance(ts, str):
            try:
                # ISO format: 2025-12-31T06:11:32.691705
                return datetime.fromisoformat(ts.replace('Z', '+00:00'))
            except:
                pass
        
        return None
    
    def upload_from_file(self, filepath: str) -> Dict[str, int]:
        """
        Upload data from a JSON file (e.g., output_data.json).
        
        Args:
            filepath: Path to JSON file
            
        Returns:
            Dict with counts of uploaded items
        """
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        return self.upload_session(data)


# ============================================
# CLI USAGE
# ============================================

if __name__ == "__main__":
    import sys
    import argparse
    
    print("\n" + "=" * 60)
    print("🍽️  RESTOINSIGHT - FIRESTORE UPLOADER")
    print("=" * 60)
    
    # Parse arguments
    parser = argparse.ArgumentParser(description='Upload emotion detection data to Firestore')
    parser.add_argument('filepath', nargs='?', help='Path to JSON file (default: output_data.json)')
    parser.add_argument('--gemini-key', '-g', help='Gemini API key for AI analysis of anomalies')
    args = parser.parse_args()
    
    # Default to output_data.json in same folder
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_file = os.path.join(script_dir, 'output_data.json')
    
    filepath = args.filepath or default_file
    gemini_key = args.gemini_key or os.getenv('GEMINI_API_KEY')
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        print("Usage: python firestore_uploader.py [path_to_json] [--gemini-key KEY]")
        sys.exit(1)
    
    print(f"📁 Loading: {filepath}")
    
    if gemini_key:
        print("🤖 Gemini AI: ENABLED (will analyze anomalies)")
    else:
        print("⚠️  Gemini AI: DISABLED (use --gemini-key to enable)")
    
    try:
        uploader = FirestoreUploader(gemini_api_key=gemini_key)
        counts = uploader.upload_from_file(filepath)
        print("\n✅ Successfully uploaded to Firestore!")
    except FileNotFoundError as e:
        print(str(e))
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
