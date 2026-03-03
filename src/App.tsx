import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Palette, Database, Globe, FileText, Image as ImageIcon, Rocket, Home, Wifi, Battery, Signal, Lightbulb } from 'lucide-react';
import SettingsApp from './apps/SettingsApp';
import DesignApp from './apps/DesignApp';
import DataApp from './apps/DataApp';
import I18nApp from './apps/I18nApp';
import NotesApp from './apps/NotesApp';
import ImagesApp from './apps/ImagesApp';
import DeployApp from './apps/DeployApp';
import ProposalsApp from './apps/ProposalsApp';

const APPS = [
  { id: 'settings', name: 'Settings', icon: <Settings size={32} className="text-white" />, color: 'bg-slate-700', component: SettingsApp },
  { id: 'design', name: 'Design', icon: <Palette size={32} className="text-white" />, color: 'bg-pink-500', component: DesignApp },
  { id: 'data', name: 'Data', icon: <Database size={32} className="text-white" />, color: 'bg-blue-500', component: DataApp },
  { id: 'i18n', name: 'i18n', icon: <Globe size={32} className="text-white" />, color: 'bg-green-500', component: I18nApp },
  { id: 'notes', name: 'Notes', icon: <FileText size={32} className="text-white" />, color: 'bg-yellow-500', component: NotesApp },
  { id: 'images', name: 'Images', icon: <ImageIcon size={32} className="text-white" />, color: 'bg-purple-500', component: ImagesApp },
  { id: 'deploy', name: 'Deploy', icon: <Rocket size={32} className="text-white" />, color: 'bg-orange-500', component: DeployApp },
  { id: 'proposals', name: 'Idées', icon: <Lightbulb size={32} className="text-white" />, color: 'bg-rose-500', component: ProposalsApp },
];

export default function App() {
  const [activeApp, setActiveApp] = useState<string | null>('proposals');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ActiveComponent = APPS.find(app => app.id === activeApp)?.component;

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 sm:p-8 font-sans">
      {/* iPhone Frame */}
      <div className="relative w-full max-w-[400px] aspect-[9/19.5] bg-black rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-neutral-800 ring-1 ring-white/10">
        
        {/* Dynamic Island / Notch Area */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pointer-events-none">
          <div className="w-1/3 h-full bg-black rounded-b-3xl"></div>
        </div>

        {/* Status Bar */}
        <div className={`absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 text-xs font-medium z-40 pointer-events-none transition-colors ${activeApp ? 'text-slate-900' : 'text-white'}`}>
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-2">
            <Signal size={14} />
            <Wifi size={14} />
            <Battery size={16} />
          </div>
        </div>

        {/* Screen Content */}
        <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 overflow-hidden">
          
          {/* Home Screen */}
          <div className="absolute inset-0 pt-20 px-6 pb-24 flex flex-col">
            <div className="grid grid-cols-4 gap-x-4 gap-y-8">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setActiveApp(app.id)}
                  className="flex flex-col items-center gap-2 group outline-none"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90 ${app.color}`}>
                    {app.icon}
                  </div>
                  <span className="text-white text-[11px] font-medium tracking-wide drop-shadow-md">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* App Window */}
          <AnimatePresence>
            {activeApp && ActiveComponent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute inset-0 bg-white z-30 flex flex-col"
              >
                {/* App Content */}
                <div className="flex-1 overflow-hidden pt-12">
                  <ActiveComponent onClose={() => setActiveApp(null)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Home Indicator */}
          <div className="absolute bottom-0 inset-x-0 h-8 flex items-end justify-center pb-2 z-50">
            <button 
              onClick={() => setActiveApp(null)}
              className={`w-1/3 h-1.5 rounded-full transition-colors cursor-pointer ${activeApp ? 'bg-slate-900/50 hover:bg-slate-900' : 'bg-white/50 hover:bg-white'}`}
              aria-label="Go home"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
