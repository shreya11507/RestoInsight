
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/anomalies', label: 'Anomaly Center', icon: 'warning' },
    { path: '/team', label: 'Team Pulse', icon: 'groups' },
    { path: '/insights', label: 'Guest Insights', icon: 'insights' },
    { path: '/kpis', label: 'Emotions', icon: 'sentiment_satisfied' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-soft">
      {/* Sidebar - Always #3E9CB1 now */}
      <nav className="hidden md:flex flex-col w-[260px] h-full flex-shrink-0 border-r border-slate-200 bg-sidebar-anomaly">
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-2xl text-sidebar-anomaly">restaurant</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-none text-white">RestoInsight</h1>
            <p className="text-xs font-medium text-white/70">Owner View</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 py-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white shadow-sm text-primary font-bold' 
                    : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <span className={`material-symbols-outlined ${location.pathname === item.path ? 'fill-1' : ''}`}>
                {item.icon}
              </span>
              <p className="text-sm">{item.label}</p>
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-black/5">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10">
            <div className="size-8 rounded-full bg-gradient-to-tr from-mint to-primary flex items-center justify-center text-xs font-bold text-white shadow-md">JD</div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">John Doe</span>
              <span className="text-[10px] text-white/60">Admin</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 px-8 py-4 bg-white/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4 text-slate-800 md:hidden">
            <span className="material-symbols-outlined">menu</span>
            <h2 className="text-lg font-bold">RestoInsight</h2>
          </div>
          
          <div className="hidden md:flex flex-1 justify-end gap-6 items-center w-full">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input 
                type="text" 
                placeholder="Search guests, tables, or alerts..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center justify-center rounded-xl size-10 bg-white border border-slate-200 text-slate-500 hover:text-primary transition-all relative shadow-sm">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-accent rounded-full border-2 border-white"></span>
              </button>
              <button className="flex items-center justify-center rounded-xl size-10 bg-white border border-slate-200 text-slate-500 hover:text-primary transition-all shadow-sm">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
