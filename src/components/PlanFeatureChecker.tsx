
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Crown, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface PlanFeatureCheckerProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  plan?: 'basic' | 'premium' | 'enterprise';
  action?: string;
  showPreview?: boolean;
}

const PlanFeatureChecker = ({ 
  feature, 
  children, 
  fallback,
  plan = 'premium',
  action,
  showPreview = false
}: PlanFeatureCheckerProps) => {
  const { hasFeature, isSubscribed, canPerformAction, user } = useAuth();
  const navigate = useNavigate();

  // Check if user can perform specific action (like creating cases with limits)
  if (action) {
    const actionCheck = canPerformAction(action);
    if (!actionCheck.allowed) {
      return (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-dashed border-orange-300 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-orange-800 mb-2">
            Limite Atteinte
          </h3>
          <p className="text-orange-700 mb-4">
            {actionCheck.reason}
          </p>
          <div className="flex justify-center space-x-2 mb-4">
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              Plan {user?.subscription?.plan || 'Aucun'}
            </Badge>
          </div>
          <Button 
            onClick={() => navigate('/subscription')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Mettre à niveau
          </Button>
        </div>
      );
    }
  }

  // Check feature access
  if (!isSubscribed || !hasFeature(feature)) {
    const planIcons = {
      basic: Crown,
      premium: Crown,
      enterprise: Zap
    };
    
    const planColors = {
      basic: 'blue',
      premium: 'amber',
      enterprise: 'purple'
    };
    
    const IconComponent = planIcons[plan];
    const color = planColors[plan];
    
    return fallback || (
      <div className={`bg-gradient-to-r from-${color}-50 to-${color}-100 border-2 border-dashed border-${color}-300 rounded-lg p-6 text-center relative overflow-hidden`}>
        {showPreview && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Aperçu limité</p>
            </div>
          </div>
        )}
        
        <IconComponent className={`h-12 w-12 text-${color}-500 mx-auto mb-4`} />
        <h3 className={`text-lg font-semibold text-${color}-800 mb-2`}>
          Fonctionnalité {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </h3>
        <p className={`text-${color}-700 mb-4`}>
          Cette fonctionnalité nécessite un abonnement {plan}.
        </p>
        
        {showPreview ? (
          <div className="space-y-2">
            <div className="opacity-30">
              {children}
            </div>
            <Button 
              onClick={() => navigate('/subscription')}
              className={`bg-${color}-600 hover:bg-${color}-700 w-full`}
            >
              Débloquer cette fonctionnalité
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => navigate('/subscription')}
            className={`bg-${color}-600 hover:bg-${color}-700`}
          >
            Mettre à niveau
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default PlanFeatureChecker;
