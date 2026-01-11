"""
RestoInsight - Gemini AI Analyzer
=================================
Analyzes anomalies using Google Gemini API (FREE tier).
Provides root cause analysis and recommendations for alerts.

Features:
- 100% FREE (uses gemini-1.5-flash)
- Text-only prompts (no image/video storage needed)
- Analyzes emotion patterns to identify root causes
- Provides actionable recommendations

Usage:
    from gemini_analyzer import GeminiAnalyzer
    
    analyzer = GeminiAnalyzer(api_key="YOUR_API_KEY")
    insights = analyzer.analyze_alert(alert_data, context)
"""

import os
import json
import time
from typing import Dict, Any, Optional, List

try:
    import google.generativeai as genai
except ImportError:
    print("❌ google-generativeai required. Install: pip install google-generativeai")
    exit(1)


class GeminiAnalyzer:
    """Analyzes restaurant anomalies using Gemini AI"""
    
    def __init__(self, api_key: str = None):
        """
        Initialize Gemini client.
        
        Args:
            api_key: Gemini API key. If not provided, reads from GEMINI_API_KEY env var.
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        if not self.api_key:
            raise ValueError(
                "❌ Gemini API key required.\n"
                "Get one free at: https://aistudio.google.com/apikey"
            )
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        # Use gemini-1.5-flash (FREE tier: 15 RPM, 1M tokens/month)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        print("✅ Gemini AI initialized (using FREE gemini-1.5-flash)")
    
    def analyze_alert(
        self,
        alert: Dict[str, Any],
        emotion_history: List[Dict[str, Any]] = None,
        staff_info: Dict[str, Any] = None,
        table_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Analyze an alert and provide AI insights.
        
        Args:
            alert: Alert data with type, severity, description
            emotion_history: Recent emotion snapshots for context
            staff_info: Staff performance data if available
            table_info: Table sentiment data if available
            
        Returns:
            Dict with root_cause, ai_recommendation, urgency_score
        """
        # Build context prompt
        prompt = self._build_prompt(alert, emotion_history, staff_info, table_info)
        
        try:
            # Call Gemini API
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=500,
                )
            )
            
            # Parse response
            return self._parse_response(response.text)
            
        except Exception as e:
            print(f"⚠️ Gemini API error: {e}")
            return {
                'root_cause': 'Unable to analyze - API error',
                'ai_recommendation': 'Please review manually and take appropriate action.',
                'urgency_score': 5
            }
    
    def _build_prompt(
        self,
        alert: Dict[str, Any],
        emotion_history: List[Dict[str, Any]] = None,
        staff_info: Dict[str, Any] = None,
        table_info: Dict[str, Any] = None
    ) -> str:
        """Build the analysis prompt for Gemini"""
        
        # Alert details
        alert_type = alert.get('alert_type', 'unknown')
        severity = alert.get('severity', 'warning')
        title = alert.get('title', 'Alert')
        description = alert.get('description', '')
        table_number = alert.get('table_number', 'Unknown')
        
        prompt = f"""You are an AI assistant for a restaurant management system called RestoInsight.
Analyze this service alert and provide actionable insights.

## ALERT DETAILS
- Type: {alert_type}
- Severity: {severity.upper()}
- Table: {table_number}
- Title: {title}
- Description: {description}
"""
        
        # Add emotion history context
        if emotion_history and len(emotion_history) > 0:
            recent_emotions = emotion_history[-10:]  # Last 10 snapshots
            emotion_summary = self._summarize_emotions(recent_emotions)
            prompt += f"""
## EMOTION HISTORY (Last {len(recent_emotions)} detections)
{emotion_summary}
"""
        
        # Add staff info
        if staff_info:
            prompt += f"""
## STAFF INVOLVED
- Name: {staff_info.get('name', 'Unknown')}
- Performance Score: {staff_info.get('score', 'N/A')}%
- Badge: {staff_info.get('badge', 'N/A')}
- Dominant Emotion: {staff_info.get('dominant_emotion', 'N/A')}
"""
        
        # Add table sentiment
        if table_info:
            guest_sentiment = table_info.get('guest_sentiment', {})
            prompt += f"""
## TABLE SENTIMENT
- Guest Happiness: {guest_sentiment.get('avg_happiness', 'N/A')}%
- Trend: {guest_sentiment.get('trend', 'N/A')}
- Dominant Emotion: {guest_sentiment.get('dominant_emotion', 'N/A')}
"""
        
        # Request format
        prompt += """
## YOUR TASK
Analyze this situation and respond in EXACTLY this JSON format (no markdown, no extra text):
{
    "root_cause": "Brief explanation of what likely caused this issue (1-2 sentences)",
    "ai_recommendation": "Specific actionable steps to resolve this (2-3 bullet points as a single string)",
    "urgency_score": <number from 1-10, where 10 is most urgent>
}

Consider:
- Restaurant service dynamics
- Customer experience impact
- Staff workload and morale
- Time sensitivity

Respond ONLY with the JSON object, nothing else.
"""
        
        return prompt
    
    def _summarize_emotions(self, emotions: List[Dict[str, Any]]) -> str:
        """Summarize emotion history for prompt"""
        if not emotions:
            return "No emotion data available"
        
        # Count emotions
        emotion_counts = {}
        person_emotions = {'guest': [], 'staff': []}
        
        for e in emotions:
            emotion = e.get('emotion', 'unknown')
            person_type = e.get('person_type', 'guest')
            
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            person_emotions[person_type].append(emotion)
        
        # Build summary
        summary_lines = []
        
        # Emotion distribution
        total = sum(emotion_counts.values())
        for emotion, count in sorted(emotion_counts.items(), key=lambda x: -x[1]):
            pct = round(count / total * 100)
            summary_lines.append(f"- {emotion}: {count} detections ({pct}%)")
        
        # Guest vs Staff
        if person_emotions['guest']:
            guest_angry = person_emotions['guest'].count('angry')
            summary_lines.append(f"- Guest emotions: {len(person_emotions['guest'])} total, {guest_angry} angry")
        
        if person_emotions['staff']:
            staff_angry = person_emotions['staff'].count('angry')
            summary_lines.append(f"- Staff emotions: {len(person_emotions['staff'])} total, {staff_angry} angry")
        
        return '\n'.join(summary_lines)
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini response to extract insights"""
        try:
            # Clean response (remove markdown if present)
            cleaned = response_text.strip()
            if cleaned.startswith('```'):
                # Remove markdown code blocks
                lines = cleaned.split('\n')
                cleaned = '\n'.join(lines[1:-1] if lines[-1] == '```' else lines[1:])
            
            # Parse JSON
            result = json.loads(cleaned)
            
            # Validate required fields
            return {
                'root_cause': result.get('root_cause', 'Analysis not available'),
                'ai_recommendation': result.get('ai_recommendation', 'Please review manually'),
                'urgency_score': min(10, max(1, int(result.get('urgency_score', 5))))
            }
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"⚠️ Failed to parse Gemini response: {e}")
            print(f"   Raw response: {response_text[:200]}...")
            
            # Try to extract useful info anyway
            return {
                'root_cause': response_text[:200] if response_text else 'Analysis failed',
                'ai_recommendation': 'Please review the situation manually and take appropriate action.',
                'urgency_score': 5
            }
    
    def analyze_alerts_batch(
        self,
        alerts: List[Dict[str, Any]],
        emotion_snapshots: List[Dict[str, Any]] = None,
        delay_between_calls: float = 4.0
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple alerts with rate limiting.
        
        Args:
            alerts: List of alert dicts
            emotion_snapshots: All emotion snapshots for context
            delay_between_calls: Seconds between API calls (FREE tier: 15 RPM = 4s)
            
        Returns:
            List of alerts with AI insights added
        """
        analyzed_alerts = []
        
        for i, alert in enumerate(alerts):
            print(f"🤖 Analyzing alert {i+1}/{len(alerts)}: {alert.get('title', 'Unknown')}")
            
            # Get emotion history for this table
            table_num = alert.get('table_number')
            table_emotions = []
            if emotion_snapshots and table_num:
                table_emotions = [
                    e for e in emotion_snapshots 
                    if e.get('table_number') == table_num
                ]
            
            # Analyze with Gemini
            insights = self.analyze_alert(alert, emotion_history=table_emotions)
            
            # Add insights to alert
            alert['root_cause'] = insights['root_cause']
            alert['ai_recommendation'] = insights['ai_recommendation']
            alert['urgency_score'] = insights['urgency_score']
            
            analyzed_alerts.append(alert)
            
            # Rate limiting (FREE tier: 15 requests per minute)
            if i < len(alerts) - 1:
                time.sleep(delay_between_calls)
        
        return analyzed_alerts


# ============================================
# CLI USAGE
# ============================================

if __name__ == "__main__":
    import sys
    
    print("\n" + "=" * 60)
    print("🤖 RESTOINSIGHT - GEMINI AI ANALYZER")
    print("=" * 60)
    
    # Test with sample alert
    api_key = os.getenv('GEMINI_API_KEY') or (sys.argv[1] if len(sys.argv) > 1 else None)
    
    if not api_key:
        print("❌ Usage: python gemini_analyzer.py <API_KEY>")
        print("   Or set GEMINI_API_KEY environment variable")
        sys.exit(1)
    
    analyzer = GeminiAnalyzer(api_key=api_key)
    
    # Test alert
    test_alert = {
        'alert_type': 'dispute_staff_customer',
        'severity': 'urgent',
        'table_number': 5,
        'title': 'Table 5: Staff-Customer Dispute',
        'description': 'Both staff and customer showing anger. Immediate intervention needed.'
    }
    
    test_emotions = [
        {'emotion': 'neutral', 'person_type': 'guest', 'table_number': 5},
        {'emotion': 'neutral', 'person_type': 'staff', 'table_number': 5},
        {'emotion': 'angry', 'person_type': 'guest', 'table_number': 5},
        {'emotion': 'angry', 'person_type': 'guest', 'table_number': 5},
        {'emotion': 'angry', 'person_type': 'staff', 'table_number': 5},
    ]
    
    print("\n📋 Test Alert:")
    print(f"   {test_alert['title']}")
    print(f"   {test_alert['description']}")
    
    print("\n🔄 Calling Gemini API...")
    insights = analyzer.analyze_alert(test_alert, emotion_history=test_emotions)
    
    print("\n✅ AI Insights:")
    print(f"   Root Cause: {insights['root_cause']}")
    print(f"   Recommendation: {insights['ai_recommendation']}")
    print(f"   Urgency Score: {insights['urgency_score']}/10")
