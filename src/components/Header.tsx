import React, { useState } from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import NotificationCenter from '@/components/NotificationCenter';

const Header = () => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white shadow-lg border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Rechercher dossiers, clients, documents..."
              className="pl-10 bg-slate-50 border-slate-300 focus:bg-white focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {user?.subscription && (
            <Badge 
              variant="outline" 
              className={`${
                user.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 
                'bg-gray-100 text-gray-800'
              }`}
            >
              {user.subscription.status === 'active' ? 
                user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1) : 
                'Inactif'
              }
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="relative hover:bg-amber-50"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              •
            </span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.firmName || 'Cabinet'}</p>
              <p className="text-xs text-amber-600">{user?.email}</p>
            </div>
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-full p-2 shadow-md">
              <User className="h-5 w-5 text-white" />
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </header>
  );
};

export default Header;
