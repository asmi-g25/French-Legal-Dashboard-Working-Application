import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PaymentService, PaymentMethod } from '@/services/paymentGateways';
import { Loader2, Smartphone, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'basic' | 'premium' | 'enterprise';
  onSuccess?: () => void;
}

const PLAN_PRICES = {
  basic: { amount: 15000, currency: 'XOF', name: 'Plan Basic' },
  premium: { amount: 35000, currency: 'XOF', name: 'Plan Premium' },
  enterprise: { amount: 75000, currency: 'XOF', name: 'Plan Enterprise' },
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking' | 'completed' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  const planInfo = PLAN_PRICES[plan];
  const availableMethods = PaymentService.getAvailablePaymentMethods();

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'EUR' : currency,
    }).format(amount).replace('€', 'FCFA');
  };

  const validatePhoneNumber = (phone: string) => {
    // Basic validation for West African phone numbers
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 8 && cleanPhone.length <= 15;
  };

  const generateTransactionId = () => {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handlePayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('pending');

    try {
      const txnId = generateTransactionId();
      setTransactionId(txnId);

      const response = await PaymentService.initiatePayment(selectedMethod, {
        amount: planInfo.amount,
        currency: planInfo.currency,
        phoneNumber: phoneNumber,
        description: `Abonnement ${planInfo.name} - JURIS`,
        reference: txnId,
        callbackUrl: `${window.location.origin}/api/payment/callback`,
        returnUrl: `${window.location.origin}/subscription?success=true`,
      });

      if (response.success) {
        setStatusMessage(response.message);
        setPaymentUrl(response.paymentUrl || '');
        
        // Start checking payment status
        setTimeout(() => {
          checkPaymentStatus(txnId);
        }, 3000);
        
        toast({
          title: "Paiement initié",
          description: response.message,
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      setStatusMessage(error.message || 'Erreur lors du paiement');
      toast({
        title: "Erreur de paiement",
        description: error.message || 'Une erreur est survenue',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async (txnId: string) => {
    setPaymentStatus('checking');
    let attempts = 0;
    const maxAttempts = 20; // Check for up to 10 minutes (30s intervals)

    const checkStatus = async () => {
      try {
        const status = await PaymentService.checkStatus(selectedMethod, txnId);
        
        if (status.status === 'completed') {
          setPaymentStatus('completed');
          setStatusMessage('Paiement confirmé! Votre abonnement est maintenant actif.');
          toast({
            title: "Paiement réussi!",
            description: "Votre abonnement a été activé avec succès.",
          });
          onSuccess?.();
          setTimeout(() => {
            onClose();
          }, 3000);
        } else if (status.status === 'failed') {
          setPaymentStatus('failed');
          setStatusMessage(status.failureReason || 'Le paiement a échoué');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 30000); // Check again in 30 seconds
        } else {
          setPaymentStatus('failed');
          setStatusMessage('Timeout: Veuillez vérifier votre paiement manuellement');
        }
      } catch (error: any) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 30000);
        } else {
          setPaymentStatus('failed');
          setStatusMessage('Impossible de vérifier le statut du paiement');
        }
      }
    };

    checkStatus();
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setTransactionId('');
    setPaymentUrl('');
    setStatusMessage('');
    setPhoneNumber('');
  };

  const renderPaymentStatus = () => {
    if (paymentStatus === 'idle') return null;

    const statusIcons = {
      pending: <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />,
      checking: <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />,
      completed: <CheckCircle className="h-6 w-6 text-green-500" />,
      failed: <XCircle className="h-6 w-6 text-red-500" />,
    };

    const statusColors = {
      pending: 'border-yellow-200 bg-yellow-50',
      checking: 'border-blue-200 bg-blue-50',
      completed: 'border-green-200 bg-green-50',
      failed: 'border-red-200 bg-red-50',
    };

    return (
      <Card className={`mt-4 ${statusColors[paymentStatus]}`}>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            {statusIcons[paymentStatus]}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {paymentStatus === 'pending' && 'Paiement en cours...'}
                {paymentStatus === 'checking' && 'Vérification du paiement...'}
                {paymentStatus === 'completed' && 'Paiement confirmé!'}
                {paymentStatus === 'failed' && 'Paiement échoué'}
              </p>
              <p className="text-sm text-gray-600">{statusMessage}</p>
              {transactionId && (
                <p className="text-xs text-gray-500 mt-1">
                  ID: {transactionId}
                </p>
              )}
            </div>
          </div>
          
          {paymentUrl && paymentStatus === 'pending' && (
            <div className="mt-3">
              <Button
                onClick={() => window.open(paymentUrl, '_blank')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Ouvrir la page de paiement
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="mt-3">
              <Button
                onClick={resetPayment}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Réessayer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Paiement - {planInfo.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{planInfo.name}</p>
                  <p className="text-sm text-gray-600">Abonnement mensuel</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatAmount(planInfo.amount, planInfo.currency)}
                  </p>
                  <p className="text-sm text-gray-600">par mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {paymentStatus === 'idle' && (
            <>
              {/* Payment Method Selection */}
              <div>
                <Label className="text-base font-medium">Mode de paiement</Label>
                <RadioGroup
                  value={selectedMethod}
                  onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}
                  className="mt-2"
                >
                  {availableMethods.map((method) => (
                    <div key={method.method} className="flex items-center space-x-2">
                      <RadioGroupItem value={method.method} id={method.method} />
                      <Label htmlFor={method.method} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4" />
                            <span>{method.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {method.currency}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {method.description}
                        </p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Phone Number Input */}
              <div>
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+225 XX XX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Numéro associé à votre compte {availableMethods.find(m => m.method === selectedMethod)?.name}
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  Après validation, vous recevrez une notification sur votre téléphone pour confirmer le paiement.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Annuler
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !phoneNumber}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      Payer {formatAmount(planInfo.amount, planInfo.currency)}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Payment Status */}
          {renderPaymentStatus()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
