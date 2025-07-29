import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout';
import PaymentModal from '@/components/PaymentModal';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionService, { SubscriptionStatus, UsageLimits } from '@/services/subscriptionService';
import {
  Check,
  Crown,
  Shield,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  Star,
  Smartphone,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Search,
  Lock,
  Zap,
  Download,
  Archive,
  Filter,
  Timer,
  Calculator,
  Mail,
  PaperclipIcon,
} from 'lucide-react';

const Subscription = () => {
  const { user, upgradePlan, loading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'enterprise' | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const subscriptionService = new SubscriptionService();

  const plans = [
    {
      id: 'basic' as const,
      name: 'Basic',
      price: 15000,
      currency: 'FCFA',
      period: 'mois',
      description: 'Idéal pour débuter',
      icon: <FileText className="h-6 w-6" />,
      color: 'border-blue-200 bg-blue-50',
      headerColor: 'bg-blue-500',
      features: [
        '10 dossiers juridiques',
        '25 fiches clients',
        '50 documents stockés',
        'Calendrier des rendez-vous',
        'Recherche simple',
        'Gestion de base des contacts',
        'Interface web responsive',
      ],
      limits: {
        cases: 10,
        clients: 25,
        documents: 50,
      },
      recommended: false,
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: 35000,
      currency: 'FCFA',
      period: 'mois',
      description: 'Pour cabinets professionnels',
      icon: <Crown className="h-6 w-6" />,
      color: 'border-amber-200 bg-amber-50',
      headerColor: 'bg-amber-500',
      features: [
        '500 dossiers juridiques',
        '1000 fiches clients',
        '5000 documents stockés',
        'Toutes les fonctionnalités Basic',
      ],
      limits: {
        cases: 500,
        clients: 1000,
        documents: 5000,
      },
      recommended: true,
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: 75000,
      currency: 'FCFA',
      period: 'mois',
      description: 'Pour grands cabinets',
      icon: <Shield className="h-6 w-6" />,
      color: 'border-purple-200 bg-purple-50',
      headerColor: 'bg-purple-500',
      features: [
        'Dossiers illimités',
        'Clients illimités', 
        'Stockage illimité',
        'Toutes les fonctionnalités Premium',
      ],
      limits: {
        cases: 'unlimited' as const,
        clients: 'unlimited' as const,
        documents: 'unlimited' as const,
      },
      recommended: false,
    },
  ];

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user?.id) return;
    
    setLoadingData(true);
    try {
      const [status, limits] = await Promise.all([
        subscriptionService.checkSubscriptionStatus(user.id),
        subscriptionService.checkUsageLimits(user.id)
      ]);
      
      setSubscriptionStatus(status);
      setUsageLimits(limits);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUsagePercentage = (used: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const handlePlanSelect = (planId: 'basic' | 'premium' | 'enterprise') => {
    if (planId === subscriptionStatus?.plan) return;
    setSelectedPlan(planId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlan(null);
    loadSubscriptionData();
  };

  const currentPlanData = plans.find(plan => plan.id === subscriptionStatus?.plan);

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement des données d'abonnement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Subscription Status Alert */}
        {subscriptionStatus && (
          <>
            {subscriptionStatus.paymentRequired && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {subscriptionStatus.isExpired 
                    ? subscriptionStatus.isInGracePeriod
                      ? `Votre abonnement a expiré ! Période de grâce: ${subscriptionStatus.gracePeriodDays + subscriptionStatus.daysRemaining} jour(s). Renouvelez immédiatement.`
                      : "Votre abonnement a expiré et la période de grâce est dépassée. L'accès est restreint."
                    : `Votre abonnement expire dans ${subscriptionStatus.daysRemaining} jour(s). Renouvelez maintenant.`
                  }
                </AlertDescription>
              </Alert>
            )}

            {!subscriptionStatus.canUseFeatures && (
              <Alert className="border-red-200 bg-red-50">
                <Lock className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  Accès bloqué. Votre abonnement a expiré. Renouvelez votre plan pour continuer à utiliser l'application.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Current Subscription Status */}
        {subscriptionStatus?.isActive && currentPlanData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Abonnement Actuel</span>
                <Badge variant="outline" className="ml-auto">
                  {currentPlanData.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plan actuel</p>
                  <p className="text-lg font-semibold">{currentPlanData.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Expire le</p>
                  <p className="text-lg font-semibold">
                    {subscriptionStatus.expiresAt ? formatDate(subscriptionStatus.expiresAt) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Real Usage Statistics */}
              {usageLimits && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Dossiers</span>
                      <span className={usageLimits.cases.percentage >= 90 ? 'text-red-600 font-semibold' : ''}>
                        {usageLimits.cases.used}/{usageLimits.cases.limit === 'unlimited' ? '∞' : usageLimits.cases.limit}
                      </span>
                    </div>
                    <Progress 
                      value={usageLimits.cases.percentage} 
                      className="h-2"
                    />
                    {usageLimits.cases.percentage >= 90 && (
                      <p className="text-xs text-red-600">Limite presque atteinte!</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Clients</span>
                      <span className={usageLimits.clients.percentage >= 90 ? 'text-red-600 font-semibold' : ''}>
                        {usageLimits.clients.used}/{usageLimits.clients.limit === 'unlimited' ? '∞' : usageLimits.clients.limit}
                      </span>
                    </div>
                    <Progress 
                      value={usageLimits.clients.percentage} 
                      className="h-2"
                    />
                    {usageLimits.clients.percentage >= 90 && (
                      <p className="text-xs text-red-600">Limite presque atteinte!</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Documents</span>
                      <span className={usageLimits.documents.percentage >= 90 ? 'text-red-600 font-semibold' : ''}>
                        {usageLimits.documents.used}/{usageLimits.documents.limit === 'unlimited' ? '∞' : usageLimits.documents.limit}
                      </span>
                    </div>
                    <Progress 
                      value={usageLimits.documents.percentage} 
                      className="h-2"
                    />
                    {usageLimits.documents.percentage >= 90 && (
                      <p className="text-xs text-red-600">Limite presque atteinte!</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Methods Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Modes de Paiement Disponibles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-sm">Orange Money</p>
                <p className="text-xs text-gray-600">Sénégal, Mali, Niger</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-sm">Moov Money</p>
                <p className="text-xs text-gray-600">Côte d'Ivoire, Bénin</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-sm">MTN Money</p>
                <p className="text-xs text-gray-600">Ghana, Uganda</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-sm">Wave</p>
                <p className="text-xs text-gray-600">Sénégal, Mali</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center">
              Paiements sécurisés via mobile money. Renouvellement automatique mensuel.
            </p>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.color} ${plan.recommended ? 'ring-2 ring-amber-300' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Recommandé
                  </Badge>
                </div>
              )}

              <CardHeader className={`${plan.headerColor} text-white rounded-t-lg`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {plan.icon}
                    <span>{plan.name}</span>
                  </div>
                  {subscriptionStatus?.plan === plan.id && (
                    <Badge variant="secondary" className="bg-white text-gray-700">
                      Actuel
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {plan.price.toLocaleString()} {plan.currency}
                  </p>
                  <p className="text-sm opacity-90">par {plan.period}</p>
                  <p className="text-sm opacity-75 mt-1">{plan.description}</p>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loading || subscriptionStatus?.plan === plan.id}
                  className="w-full"
                  variant={subscriptionStatus?.plan === plan.id ? "outline" : "default"}
                >
                  {loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : subscriptionStatus?.plan === plan.id ? (
                    'Plan Actuel'
                  ) : subscriptionStatus?.plan && plans.findIndex(p => p.id === subscriptionStatus.plan) > plans.findIndex(p => p.id === plan.id) ? (
                    'Rétrograder'
                  ) : (
                    'Choisir ce plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Layout>
  );
};

export default Subscription;
