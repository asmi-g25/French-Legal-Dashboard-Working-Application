
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Auth from '@/pages/Auth';
import FeaturePreviewModal from '@/components/FeaturePreviewModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  featureName?: string;
}

const ProtectedRoute = ({ 
  children, 
  requireSubscription = false, 
  featureName = "Cette fonctionnalité"
}: ProtectedRouteProps) => {
  const { user, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!user) {
    return <Auth />;
  }

  if (requireSubscription && !isSubscribed) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="bg-amber-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Abonnement requis</h2>
            <p className="text-gray-600 mb-6">
              {featureName} nécessite un abonnement actif pour accéder à toutes les fonctionnalités avancées.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aperçu des fonctionnalités
              </button>
              <button
                onClick={() => navigate('/subscription')}
                className="block w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Voir les abonnements
              </button>
            </div>
          </div>
        </div>
        
        <FeaturePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          featureName={featureName}
          requiredPlan="premium"
          onUpgrade={() => {
            setShowPreviewModal(false);
            navigate('/subscription');
          }}
        />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
