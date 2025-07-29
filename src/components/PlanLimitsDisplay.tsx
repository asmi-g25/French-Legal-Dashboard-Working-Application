
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Calendar, Building, AlertTriangle, CheckCircle } from 'lucide-react';

const PlanLimitsDisplay = () => {
  const { user, getPlanLimits } = useAuth();
  const limits = getPlanLimits();

  if (!limits || !user?.subscription || !user.usage) return null;

  const limitItems = [
    {
      icon: FileText,
      label: 'Dossiers',
      current: user.usage.cases,
      max: limits.maxCases,
      color: 'blue'
    },
    {
      icon: Users,
      label: 'Clients',
      current: user.usage.clients,
      max: limits.maxClients,
      color: 'green'
    },
    {
      icon: Calendar,
      label: 'Documents',
      current: user.usage.documents,
      max: limits.maxDocuments,
      color: 'purple'
    },
    {
      icon: Building,
      label: 'Utilisateurs',
      current: user.usage.users,
      max: limits.maxUsers,
      color: 'orange'
    }
  ];

  const getUsageStatus = (current: number, max: number | 'unlimited') => {
    if (max === 'unlimited') return 'unlimited';
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'ok';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Utilisation - Plan {user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1)}</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {user.subscription.status === 'active' ? 'Actif' : 'Inactif'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {limitItems.map((item, index) => {
            const IconComponent = item.icon;
            const isUnlimited = item.max === 'unlimited';
            const percentage = isUnlimited ? 0 : (item.current / (item.max as number)) * 100;
            const status = getUsageStatus(item.current, item.max);
            
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`h-4 w-4 text-${item.color}-500`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {item.current.toLocaleString()}/{isUnlimited ? '∞' : item.max.toLocaleString()}
                    </span>
                    {status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    {status === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    {status === 'ok' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {status === 'unlimited' && <span className="text-blue-500">∞</span>}
                  </div>
                </div>
                
                {!isUnlimited && (
                  <div className="space-y-1">
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${
                        status === 'critical' ? 'bg-red-100' : 
                        status === 'warning' ? 'bg-orange-100' : 
                        'bg-gray-100'
                      }`}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{percentage.toFixed(0)}% utilisé</span>
                      <span className={
                        status === 'critical' ? 'text-red-600 font-medium' : 
                        status === 'warning' ? 'text-orange-600 font-medium' : 
                        'text-gray-500'
                      }>
                        {status === 'critical' ? 'Limite critique' : 
                         status === 'warning' ? 'Attention' : 
                         'OK'}
                      </span>
                    </div>
                  </div>
                )}
                
                {isUnlimited && (
                  <div className="text-xs text-blue-600 font-medium">
                    Utilisation illimitée
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Feature highlights based on plan */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Fonctionnalités actives</h4>
          <div className="flex flex-wrap gap-2">
            {limits.features.slice(0, 8).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
            {limits.features.length > 8 && (
              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                +{limits.features.length - 8} autres
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanLimitsDisplay;
