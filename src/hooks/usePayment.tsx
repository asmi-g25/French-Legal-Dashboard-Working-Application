
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface PaymentData {
  amount: number;
  planId: string;
  description: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const processPayment = async (paymentData: PaymentData): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Processing payment:', paymentData);
      
      // Update user subscription in localStorage
      if (user) {
        const updatedUser = {
          ...user,
          subscription: {
            status: 'active' as const,
            plan: paymentData.planId as 'basic' | 'premium' | 'enterprise',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            startedAt: new Date().toISOString()
          }
        };
        localStorage.setItem('juris_user', JSON.stringify(updatedUser));
        
        // Force page reload to update auth context
        setTimeout(() => window.location.reload(), 500);
      }

      toast({
        title: "Abonnement activé!",
        description: `Votre plan ${paymentData.planId} est maintenant actif.`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Erreur de paiement",
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading };
};
