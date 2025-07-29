import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SubscriptionService from '@/services/subscriptionService';
import { AlertTriangle, Lock, CreditCard, ArrowRight, Crown } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  action?: string;
  feature?: string;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

interface AccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  paymentRequired?: boolean;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  action, 
  feature, 
  fallback,
  showUpgradePrompt = true 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionService = new SubscriptionService();

  useEffect(() => {
    checkAccess();
  }, [user, action, feature]);

  const checkAccess = async () => {
    if (!user?.id) {
      setAccessResult({ allowed: false, reason: 'Utilisateur non connecté', paymentRequired: true });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let result: AccessResult = { allowed: true };

      // Check subscription access if action is specified
      if (action) {
        result = await subscriptionService.enforceSubscriptionAccess(user.id, action);
      }
      
      // Check feature availability if feature is specified
      if (feature && result.allowed) {
        const hasFeature = await subscriptionService.hasFeature(user.id, feature);
        if (!hasFeature) {
          result = {
            allowed: false,
            reason: `Cette fonctionnalité nécessite un plan premium ou enterprise.`,
            upgradeRequired: true,
          };
        }
      }

      setAccessResult(result);
    } catch (error) {
      console.error('Error checking subscription access:', error);
      setAccessResult({ 
        allowed: false, 
        reason: 'Erreur lors de la vérification de l\'abonnement',
        paymentRequired: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const handleRenew = () => {
    navigate('/subscription');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Vérification des accès...</span>
      </div>
    );
  }

  if (!accessResult?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showUpgradePrompt) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {accessResult?.reason || 'Accès non autorisé'}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            {accessResult?.paymentRequired ? (
              <CreditCard className="h-6 w-6 text-white" />
            ) : (
              <Crown className="h-6 w-6 text-white" />
            )}
          </div>
          <CardTitle className="text-xl">
            {accessResult?.paymentRequired ? 'Abonnement requis' : 'Mise à niveau requise'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {accessResult?.reason || 'Vous devez mettre à niveau votre plan pour accéder à cette fonctionnalité.'}
          </p>
          
          {accessResult?.paymentRequired && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-700">
                Votre abonnement est requis pour continuer à utiliser cette fonctionnalité.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {accessResult?.paymentRequired ? (
              <Button 
                onClick={handleRenew} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Renouveler l'abonnement
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleUpgrade} 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Crown className="h-4 w-4 mr-2" />
                Mettre à niveau le plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Retour au tableau de bord
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Avantages des plans premium :</h4>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• Notifications WhatsApp et Email automatiques</li>
              <li>• Limites étendues pour dossiers et clients</li>
              <li>• Fonctionnalités avancées de gestion</li>
              <li>• Support prioritaire</li>
              <li>• Rapports détaillés</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

// Wrapper hook for easier usage
export const useSubscriptionGuard = () => {
  const { user } = useAuth();
  const subscriptionService = new SubscriptionService();

  const checkAccess = async (action: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const result = await subscriptionService.enforceSubscriptionAccess(user.id, action);
      return result.allowed;
    } catch (error) {
      console.error('Error checking subscription access:', error);
      return false;
    }
  };

  const checkFeature = async (feature: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      return await subscriptionService.hasFeature(user.id, feature);
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  };

  const blockIfExpired = async (): Promise<{ blocked: boolean; reason?: string }> => {
    if (!user?.id) return { blocked: true, reason: 'Utilisateur non connecté' };
    
    try {
      return await subscriptionService.blockAccessIfExpired(user.id);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { blocked: true, reason: 'Erreur de vérification' };
    }
  };

  return {
    checkAccess,
    checkFeature,
    blockIfExpired,
  };
};

// Higher-order component for protecting entire pages
export const withSubscriptionGuard = (
  WrappedComponent: React.ComponentType<any>,
  options: {
    action?: string;
    feature?: string;
    redirectTo?: string;
  } = {}
) => {
  return (props: any) => {
    return (
      <SubscriptionGuard 
        action={options.action} 
        feature={options.feature}
        showUpgradePrompt={true}
      >
        <WrappedComponent {...props} />
      </SubscriptionGuard>
    );
  };
};

export default SubscriptionGuard;
