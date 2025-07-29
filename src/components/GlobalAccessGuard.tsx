import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentValidationService, { PaymentStatus } from '@/services/paymentValidationService';
import { AlertTriangle, Lock, CreditCard, Clock, DollarSign, Calendar } from 'lucide-react';

interface GlobalAccessGuardProps {
  children: React.ReactNode;
}

const GlobalAccessGuard: React.FC<GlobalAccessGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockAccess, setBlockAccess] = useState(false);
  const paymentService = new PaymentValidationService();

  // Pages that should be accessible even when payment is overdue
  const allowedPages = ['/subscription', '/auth'];
  
  useEffect(() => {
    checkPaymentStatus();
    
    // Check payment status periodically
    const interval = setInterval(checkPaymentStatus, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [user]);

  const checkPaymentStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const status = await paymentService.checkPaymentStatus(user.id);
      setPaymentStatus(status);
      
      // Block access if payment is overdue and not on allowed pages
      const currentPath = location.pathname;
      const isAllowedPage = allowedPages.some(page => currentPath.startsWith(page));
      
      setBlockAccess(status.accessBlocked && !isAllowedPage);
    } catch (error) {
      console.error('Error checking payment status:', error);
      // On error, be conservative and check if subscription is expired
      setBlockAccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = () => {
    navigate('/subscription');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (!paymentStatus) return null;

    if (paymentStatus.accessBlocked) {
      return <Badge variant="destructive" className="ml-2">Accès bloqué</Badge>;
    }
    
    if (paymentStatus.paymentDue) {
      return <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">Paiement en retard</Badge>;
    }
    
    if (paymentStatus.isCurrentMonthPaid) {
      return <Badge variant="outline" className="ml-2 border-green-500 text-green-700">À jour</Badge>;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification du statut de paiement...</p>
        </div>
      </div>
    );
  }

  // Show payment warning even if access is not blocked
  const showPaymentWarning = paymentStatus && (paymentStatus.paymentDue || paymentStatus.daysOverdue > 0) && !blockAccess;

  // If access is blocked, show payment required screen
  if (blockAccess && paymentStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-red-800">
              Accès suspendu - Paiement requis
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                Votre abonnement a expiré depuis <strong>{paymentStatus.daysOverdue} jour(s)</strong>. 
                L'accès à l'application est maintenant bloqué.
              </AlertDescription>
            </Alert>

            <div className="bg-white p-6 rounded-lg border border-red-200 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-red-600" />
                Détails du paiement
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Plan actuel:</p>
                  <p className="font-semibold capitalize">{paymentStatus.currentPlan || 'Aucun'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Montant mensuel:</p>
                  <p className="font-semibold">{paymentStatus.monthlyAmount.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-gray-600">Jours de retard:</p>
                  <p className="font-semibold text-red-600">{paymentStatus.daysOverdue}</p>
                </div>
                <div>
                  <p className="text-gray-600">Dernier paiement:</p>
                  <p className="font-semibold">
                    {paymentStatus.lastPaymentDate 
                      ? formatDate(paymentStatus.lastPaymentDate)
                      : 'Aucun'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3">Pour rétablir l'accès :</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Effectuez le paiement de votre abonnement mensuel</li>
                <li>• L'accès sera rétabli immédiatement après confirmation du paiement</li>
                <li>• Tous vos données sont sauvegardées et seront accessibles</li>
                <li>• Contact support si vous rencontrez des difficultés</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRenewSubscription}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Renouveler l'abonnement
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = 'mailto:support@lawfirm.com'}
                size="lg"
              >
                Contacter le support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Payment warning banner for overdue but not blocked accounts */}
      {showPaymentWarning && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <span className="font-semibold">Paiement en retard</span>
                {paymentStatus.gracePeriodRemaining > 0 ? (
                  <span className="ml-2">
                    Période de grâce: {paymentStatus.gracePeriodRemaining} jour(s) restant(s)
                  </span>
                ) : (
                  <span className="ml-2">
                    {paymentStatus.daysOverdue} jour(s) de retard
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm">
                {paymentStatus.monthlyAmount.toLocaleString()} FCFA
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRenewSubscription}
                className="bg-white text-orange-600 border-white hover:bg-orange-50"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Payer maintenant
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  );
};

export default GlobalAccessGuard;
