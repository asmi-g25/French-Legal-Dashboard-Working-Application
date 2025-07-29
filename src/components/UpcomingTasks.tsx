
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

const UpcomingTasks = () => {
  const tasks = [
    {
      title: 'Audience Tribunal',
      description: 'Dossier Martin vs. Martin',
      date: 'Aujourd\'hui',
      time: '14:30',
      type: 'Audience'
    },
    {
      title: 'Rendez-vous Client',
      description: 'Consultation Famille Petit',
      date: 'Demain',
      time: '10:00',
      type: 'RDV'
    },
    {
      title: 'Échéance Dépôt',
      description: 'Dossier TechCorp - Contrat',
      date: '16 Juin',
      time: '17:00',
      type: 'Échéance'
    },
    {
      title: 'Expertise Judiciaire',
      description: 'Affaire Immobilière Dupont',
      date: '18 Juin',
      time: '09:00',
      type: 'Expertise'
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Audience':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RDV':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Échéance':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Expertise':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
        <CardTitle className="flex items-center space-x-2 text-slate-800">
          <Calendar className="h-5 w-5 text-amber-600" />
          <span>Prochaines Échéances</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-4 bg-gradient-to-r from-white to-amber-50/30 border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-800 text-sm">
                    {task.title}
                  </h4>
                  <Badge className={`${getTypeColor(task.type)} border font-medium`}>
                    {task.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  {task.description}
                </p>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-amber-600" />
                    <span>{task.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span>{task.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;
