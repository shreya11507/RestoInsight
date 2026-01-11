
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: string;
  color: string;
  delay?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendUp, icon, color, delay }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${delay}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-20 ${color}`}></div>
      
      <div className="flex items-start justify-between z-10">
        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">{label}</p>
        <span className="material-symbols-outlined text-slate-400">{icon}</span>
      </div>
      
      <div className="z-10 mt-auto">
        <p className="text-4xl font-black text-slate-800 tracking-tight">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trendUp ? 'text-green-600' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-sm">{trendUp ? 'trending_up' : 'remove'}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
