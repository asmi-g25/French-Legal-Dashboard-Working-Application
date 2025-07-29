
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Star } from 'lucide-react';

interface FeaturePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: 'basic' | 'premium' | 'enterprise';
  onUpgrade: () => void;
}

const FeaturePreviewModal = ({ 
  isOpen, 
  onClose, 
  featureName, 
  requiredPlan, 
  onUpgrade 
}: FeaturePreviewModalProps) => {
  const planDetails = {
    basic: { name: 'Basic', price: 29, icon: Star, color: 'blue' },
    premium: { name: 'Premium', price: 79, icon: Crown, color: 'amber' },
    enterprise: { name: 'Enterprise', price: 149, icon: Lock, color: 'purple' }
  };

  const plan = planDetails[requiredPlan];
  const IconComponent = plan.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center space-x-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <span>Fonctionnalité Premium</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className={`mx-auto w-16 h-16 bg-${plan.color}-100 rounded-full flex items-center justify-center`}>
            <IconComponent className={`h-8 w-8 text-${plan.color}-600`} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">{featureName}</h3>
            <p className="text-gray-600 mb-4">
              Cette fonctionnalité nécessite un abonnement {plan.name}.
            </p>
          </div>

          <Badge variant="outline" className={`bg-${plan.color}-50 text-${plan.color}-700`}>
            {plan.name} - {plan.price}€/mois
          </Badge>

          <div className="space-y-2 pt-4">
            <Button 
              onClick={onUpgrade}
              className={`w-full bg-${plan.color}-600 hover:bg-${plan.color}-700`}
            >
              Passer à {plan.name}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Plus tard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturePreviewModal;
