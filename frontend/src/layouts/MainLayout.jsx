import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Beaker, Zap, Layers, Settings, LogOut, Menu } from 'lucide-react';
import { motion } from 'motion/react';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

export const MainLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 280 }}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="glass-panel m-4 flex flex-col justify-between overflow-hidden"
      >
        <div>
          <div className="flex items-center gap-3 px-6 py-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Layers className="text-white" size={24} />
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400"
              >
                MES Cortex
              </motion.span>
            )}
          </div>

          <nav className="px-3 flex flex-col gap-2 mt-4">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem to="/almacen" icon={Package} label="Almacén (Próx)" />
            <SidebarItem to="/mezclado" icon={Beaker} label="Mezclado (Próx)" />
            <SidebarItem to="/extrusion" icon={Zap} label="Extrusión (Próx)" />
            <SidebarItem to="/telares" icon={Layers} label="Telares (Próx)" />
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700/50 mt-auto">
          <nav className="flex flex-col gap-2">
            <SidebarItem to="/settings" icon={Settings} label="Ajustes" />
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
              <LogOut size={20} />
              {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
            </button>
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-4 pl-0">
        <header className="glass-panel px-6 py-4 mb-4 flex justify-between items-center h-20">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-semibold text-slate-200">Alta Dirección</div>
              <div className="text-xs text-slate-400">SuperAdmin</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-blue-500/50 overflow-hidden flex items-center justify-center">
              <span className="text-sm font-bold text-blue-400">AD</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto rounded-xl">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
