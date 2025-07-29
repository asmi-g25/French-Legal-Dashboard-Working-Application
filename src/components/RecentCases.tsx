
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const RecentCases = () => {
  const cases = [
    {
      id: '2024-001',
      title: 'Divorce Martin vs. Martin',
      client: 'Sophie Martin',
      status: 'En cours',
      priority: 'Haute',
      lastActivity: '2 heures',
      lawyer: 'Me. Dubois'
    },
    {
      id: '2024-002',
      title: 'Succession Famille Petit',
      client: 'Jean Petit',
      status: 'En attente',
      priority: 'Moyenne',
      lastActivity: '1 jour',
      lawyer: 'Me. Bernard'
    },
    {
      id: '2024-003',
      title: 'Contrat Commercial - TechCorp',
      client: 'TechCorp SARL',
      status: 'Terminé',
      priority: 'Basse',
      lastActivity: '3 jours',
      lawyer: 'Me. Dubois'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En attente':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Terminé':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Moyenne':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Basse':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
        <CardTitle className="text-slate-800">Dossiers Récents</CardTitle>
        <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
          Voir tous
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {cases.map((case_) => (
            <div
              key={case_.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-amber-50/30 border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-slate-800">
                    {case_.title}
                  </h3>
                  <Badge className={`${getPriorityColor(case_.priority)} border font-medium`}>
                    {case_.priority}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Client: {case_.client} • {case_.lawyer}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Dernière activité: il y a {case_.lastActivity}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={`${getStatusColor(case_.status)} border font-medium`}>
                  {case_.status}
                </Badge>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  #{case_.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentCases;
