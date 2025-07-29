import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Users,
  FileText,
  Folder,
  Activity,
  MessageSquare,
  User,
  FolderKey,
  CreditCard,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
  const location = useLocation();
  const { isSubscribed } = useAuth();
  
  const menuItems = [
    { icon: Activity, label: 'Tableau de bord', href: '/', requireSub: false },
    { icon: CreditCard, label: 'Abonnements', href: '/subscription', requireSub: false },
    { icon: Folder, label: 'Dossiers', href: '/cases', requireSub: true },
    { icon: Users, label: 'Clients', href: '/clients', requireSub: true },
    { icon: Calendar, label: 'Calendrier', href: '/calendar', requireSub: true },
    { icon: FileText, label: 'Documents', href: '/documents', requireSub: true },
    { icon: MessageSquare, label: 'Communications', href: '/communications', requireSub: true },
    { icon: User, label: 'Contacts', href: '/contacts', requireSub: true },
    { icon: FolderKey, label: 'Facturation', href: '/billing', requireSub: true },

  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl h-screen sticky top-0">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/uploads/1747009a-89a1-4185-bd4f-b17a8376c637.png" 
            alt="Juris Logo" 
            className="w-12 h-12 rounded-full bg-white p-1"
          />
          <div>
            <h1 className="text-xl font-bold text-white">
              JURIS
            </h1>
            <p className="text-sm text-amber-300">
              Gestion Juridique
            </p>
          </div>
        </div>
      </div>
      
      <nav className="mt-4">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          const isLocked = item.requireSub && !isSubscribed;
          
          return (
            <Link
              key={index}
              to={item.href}
              className={cn(
                "flex items-center px-6 py-4 text-slate-300 hover:bg-gradient-to-r hover:from-amber-600/20 hover:to-amber-500/20 hover:text-amber-300 transition-all duration-300 border-l-4 border-transparent relative",
                isActive && "bg-gradient-to-r from-amber-600/30 to-amber-500/30 text-amber-300 border-l-amber-400 shadow-lg",
                isLocked && "opacity-50"
              )}
            >
              <item.icon className="h-5 w-5 mr-4" />
              <span className="font-medium">{item.label}</span>
              {isLocked && (
                <div className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Premium
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-full p-6">
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl p-4 text-white text-center shadow-lg">
          <p className="text-sm font-semibold">Cabinet Juridique</p>
          <p className="text-xs opacity-90 mt-1">Version Professionnelle</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
