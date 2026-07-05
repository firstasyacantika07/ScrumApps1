import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, ChevronDown } from 'lucide-react';

const WorkspaceSwitcher = () => {
    const { user, switchWorkspace } = useAuth();

    const workspaces = user?.workspaces || [];

    if (workspaces.length <= 1) {
        return (
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <div className="bg-[#D31217]/10 p-2 rounded-lg">
                    <Building2 className="w-5 h-5 text-[#D31217]" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                        {user?.workspaces?.[0]?.company_name || 'My Workspace'}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                        {user?.role || 'User'}
                    </span>
                </div>
            </div>
        );
    }

    const currentWorkspace = workspaces.find(ws => ws.tenant_id === user?.tenant_id) || workspaces[0];

    return (
        <div className="px-4 py-3 border-b border-gray-100 relative group">
            <button className="w-full flex items-center justify-between bg-white hover:bg-gray-50 p-2 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="bg-[#D31217] p-1.5 rounded text-white flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start overflow-hidden text-left">
                        <span className="text-sm font-bold text-gray-800 truncate w-full">
                            {currentWorkspace?.company_name || 'Workspace'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#D31217]">
                            {currentWorkspace?.role || user?.role}
                        </span>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {/* Dropdown Menu (Muncul saat hover) */}
            <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform origin-top translate-y-[-10px] group-hover:translate-y-0">
                <div className="px-3 pb-2 mb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ganti Workspace</span>
                </div>
                
                {workspaces.map((ws) => (
                    <button
                        key={ws.tenant_id}
                        onClick={() => switchWorkspace(ws.tenant_id)}
                        className={`w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors text-left ${ws.tenant_id === user?.tenant_id ? 'bg-red-50/50' : ''}`}
                    >
                        <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm font-medium truncate ${ws.tenant_id === user?.tenant_id ? 'text-[#D31217]' : 'text-gray-700'}`}>
                                {ws.company_name}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase">{ws.role}</span>
                        </div>
                        {ws.tenant_id === user?.tenant_id && (
                            <div className="w-2 h-2 rounded-full bg-[#D31217]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WorkspaceSwitcher;
