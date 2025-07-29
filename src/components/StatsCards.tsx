
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Folder, FileText, Calendar } from 'lucide-react';

const StatsCards = () => {
  const stats = [
    {
      title: 'Dossiers Actifs',
      value: '127',
      change: '+12%',
      changeType: 'positive',
      icon: Folder,
      color: 'bg-gradient-to-r from-amber-500 to-amber-600'
    },
    {
      title: 'Clients',
      value: '89',
      change: '+8%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-gradient-to-r from-slate-600 to-slate-700'
    },
    {
      title: 'Documents',
      value: '1,243',
      change: '+23%',
      changeType: 'positive',
      icon: FileText,
      color: 'bg-gradient-to-r from-amber-600 to-amber-700'
    },
    {
      title: 'RDV Cette Semaine',
      value: '18',
      change: '+2',
      changeType: 'positive',
      icon: Calendar,
      color: 'bg-gradient-to-r from-slate-500 to-slate-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-xl transition-all duration-300 border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {stat.value}
                </p>
                <p className={`text-sm mt-2 ${
                  stat.changeType === 'positive' 
                    ? 'text-amber-600' 
                    : 'text-red-600'
                }`}>
                  {stat.change} ce mois
                </p>
              </div>
              <div className={`${stat.color} rounded-xl p-3 shadow-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
