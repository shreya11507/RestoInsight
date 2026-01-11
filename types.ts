
export interface MetricData {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: string;
  colorClass: string;
}

export interface SentimentData {
  label: string;
  percentage: number;
  emoji: string;
  color: string;
}

export interface AlertData {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'urgent' | 'warning' | 'info';
}

export interface TableStatus {
  id: string;
  status: 'Engaged' | 'Waiting' | 'Free' | 'Bill Needed' | 'Cleaning';
  time: string;
  progress: number;
  type: 'mint' | 'blue' | 'yellow' | 'pink';
}
