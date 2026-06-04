import { Bell, Sun, UserCircle, Grid } from 'lucide-react';

const Topbar = ({ title = "Proyek" }) => (
  <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
    <div className="flex items-center gap-3 text-sm">
      <div className="bg-rose-50 p-1.5 rounded text-scrum-red"><Grid size={16}/></div>
      <span className="text-gray-400 font-medium">{title}</span>
      <span className="text-gray-300">/</span>
      <span className="text-scrum-red font-bold">Semua</span>
    </div>
    
    <div className="flex items-center gap-5 text-gray-400">
      <button className="hover:text-scrum-red transition-colors"><Bell size={20} /></button>
      <button className="hover:text-scrum-red transition-colors"><Sun size={20} /></button>
      <button className="hover:text-scrum-red transition-colors"><UserCircle size={24} /></button>
    </div>
  </header>
);

export default Topbar;