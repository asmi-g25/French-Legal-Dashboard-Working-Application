
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Users, Calendar, MessageSquare } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      title: 'Nouveau Dossier',
      description: 'Créer un nouveau dossier client',
      icon: Plus,
      color: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'
    },
    {
      title: 'Ajouter Document',
      description: 'Uploader un document',
      icon: FileText,
      color: 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
    },
    {
      title: 'Nouveau Client',
      description: 'Enregistrer un nouveau client',
      icon: Users,
      color: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    },
    {
      title: 'Planifier RDV',
      description: 'Programmer un rendez-vous',
      icon: Calendar,
      color: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
    },
    {
      title: 'Envoyer Message',
      description: 'Contacter un client',
      icon: MessageSquare,
      color: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
    }
  ];

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
        <CardTitle className="text-slate-800">Actions Rapides</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              className={`${action.color} text-white h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <p className="font-semibold text-sm">{action.title}</p>
                <p className="text-xs opacity-90">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
