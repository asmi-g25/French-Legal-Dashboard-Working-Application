import { supabase } from '@/integrations/supabase/client';
import NotificationService from './notificationService';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: 'basic' | 'premium' | 'enterprise' | null;
  expiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
  gracePeriodDays: number;
  canUseFeatures: boolean;
  isInGracePeriod: boolean;
  paymentRequired: boolean;
}

export interface UsageLimits {
  cases: { used: number; limit: number | 'unlimited'; canAdd: boolean; percentage: number };
  clients: { used: number; limit: number | 'unlimited'; canAdd: boolean; percentage: number };
  documents: { used: number; limit: number | 'unlimited'; canAdd: boolean; percentage: number };
}

export interface RealUsageData {
  cases: number;
  clients: number;
  documents: number;
}

class SubscriptionService {
  private notificationService: NotificationService;
  private gracePeriodDays = 3; // Reduced grace period for production

  constructor() {
    this.notificationService = new NotificationService();
  }

  async checkSubscriptionStatus(firmId: string): Promise<SubscriptionStatus> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firmId)
        .single();

      if (error || !profile) {
        return {
          isActive: false,
          plan: null,
          expiresAt: null,
          daysRemaining: 0,
          isExpired: true,
          gracePeriodDays: this.gracePeriodDays,
          canUseFeatures: false,
          isInGracePeriod: false,
          paymentRequired: true,
        };
      }

      const now = new Date();
      const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
      const isActive = profile.subscription_status === 'active';
      
      let daysRemaining = 0;
      let isExpired = true;
      let canUseFeatures = false;
      let isInGracePeriod = false;
      let paymentRequired = false;

      if (expiresAt) {
        const diffTime = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining <= 0;
        isInGracePeriod = isExpired && Math.abs(daysRemaining) <= this.gracePeriodDays;
        
        // Features are available if subscription is active and not expired, or during grace period
        canUseFeatures = isActive && (daysRemaining > 0 || isInGracePeriod);
        
        // Payment is required if expired or expiring in 3 days
        paymentRequired = daysRemaining <= 3;
      } else {
        // No subscription found - require payment
        paymentRequired = true;
      }

      return {
        isActive,
        plan: profile.subscription_plan as 'basic' | 'premium' | 'enterprise' | null,
        expiresAt: profile.subscription_expires_at,
        daysRemaining: Math.max(daysRemaining, 0),
        isExpired,
        gracePeriodDays: this.gracePeriodDays,
        canUseFeatures,
        isInGracePeriod,
        paymentRequired,
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return {
        isActive: false,
        plan: null,
        expiresAt: null,
        daysRemaining: 0,
        isExpired: true,
        gracePeriodDays: this.gracePeriodDays,
        canUseFeatures: false,
        isInGracePeriod: false,
        paymentRequired: true,
      };
    }
  }

  async getRealUsageData(firmId: string): Promise<RealUsageData> {
    try {
      const [casesResult, clientsResult, documentsResult] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact' }).eq('firm_id', firmId),
        supabase.from('clients').select('id', { count: 'exact' }).eq('firm_id', firmId),
        supabase.from('documents').select('id', { count: 'exact' }).eq('firm_id', firmId),
      ]);

      return {
        cases: casesResult.count || 0,
        clients: clientsResult.count || 0,
        documents: documentsResult.count || 0,
      };
    } catch (error) {
      console.error('Error getting real usage data:', error);
      return { cases: 0, clients: 0, documents: 0 };
    }
  }

  async checkUsageLimits(firmId: string): Promise<UsageLimits> {
    try {
      const [profile, realUsage] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', firmId).single(),
        this.getRealUsageData(firmId)
      ]);

      const planLimits = this.getPlanLimits(profile.data?.subscription_plan as 'basic' | 'premium' | 'enterprise');
      
      const calculateCanAdd = (used: number, limit: number | 'unlimited') => {
        return limit === 'unlimited' || used < limit;
      };

      const calculatePercentage = (used: number, limit: number | 'unlimited') => {
        if (limit === 'unlimited') return 0;
        return Math.min((used / limit) * 100, 100);
      };

      return {
        cases: {
          used: realUsage.cases,
          limit: planLimits.maxCases,
          canAdd: calculateCanAdd(realUsage.cases, planLimits.maxCases),
          percentage: calculatePercentage(realUsage.cases, planLimits.maxCases),
        },
        clients: {
          used: realUsage.clients,
          limit: planLimits.maxClients,
          canAdd: calculateCanAdd(realUsage.clients, planLimits.maxClients),
          percentage: calculatePercentage(realUsage.clients, planLimits.maxClients),
        },
        documents: {
          used: realUsage.documents,
          limit: planLimits.maxDocuments,
          canAdd: calculateCanAdd(realUsage.documents, planLimits.maxDocuments),
          percentage: calculatePercentage(realUsage.documents, planLimits.maxDocuments),
        },
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      
      // Return restrictive limits on error
      return {
        cases: { used: 0, limit: 0, canAdd: false, percentage: 100 },
        clients: { used: 0, limit: 0, canAdd: false, percentage: 100 },
        documents: { used: 0, limit: 0, canAdd: false, percentage: 100 },
      };
    }
  }

  async enforceSubscriptionAccess(firmId: string, action: string): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    upgradeRequired?: boolean;
    paymentRequired?: boolean;
  }> {
    const status = await this.checkSubscriptionStatus(firmId);
    
    // Block access if subscription is expired and not in grace period
    if (!status.canUseFeatures) {
      if (status.isExpired && !status.isInGracePeriod) {
        return {
          allowed: false,
          reason: 'Votre abonnement a expiré. Renouvelez-le immédiatement pour continuer à utiliser cette fonctionnalité.',
          paymentRequired: true,
        };
      }
      
      if (status.isInGracePeriod) {
        return {
          allowed: false,
          reason: `Votre abonnement a expiré. Il vous reste ${this.gracePeriodDays + status.daysRemaining} jour(s) de période de grâce. Renouvelez maintenant.`,
          paymentRequired: true,
        };
      }
      
      return {
        allowed: false,
        reason: 'Aucun abonnement actif. Souscrivez à un plan pour utiliser cette fonctionnalité.',
        paymentRequired: true,
      };
    }

    // Check specific action limits
    const limits = await this.checkUsageLimits(firmId);
    
    switch (action) {
      case 'create_case':
        if (!limits.cases.canAdd) {
          return {
            allowed: false,
            reason: `Limite de ${limits.cases.limit} dossiers atteinte (${limits.cases.used}/${limits.cases.limit}). Mettez à niveau votre plan pour en créer davantage.`,
            upgradeRequired: true,
          };
        }
        break;
        
      case 'add_client':
        if (!limits.clients.canAdd) {
          return {
            allowed: false,
            reason: `Limite de ${limits.clients.limit} clients atteinte (${limits.clients.used}/${limits.clients.limit}). Mettez à niveau votre plan pour en ajouter davantage.`,
            upgradeRequired: true,
          };
        }
        break;
        
      case 'upload_document':
        if (!limits.documents.canAdd) {
          return {
            allowed: false,
            reason: `Limite de ${limits.documents.limit} documents atteinte (${limits.documents.used}/${limits.documents.limit}). Mettez à niveau votre plan pour en ajouter davantage.`,
            upgradeRequired: true,
          };
        }
        break;
        
      case 'whatsapp_notifications':
        if (!await this.hasFeature(firmId, 'whatsapp_notifications')) {
          return {
            allowed: false,
            reason: 'Les notifications WhatsApp nécessitent un plan Premium ou Enterprise.',
            upgradeRequired: true,
          };
        }
        break;
        
      case 'email_notifications':
        if (!await this.hasFeature(firmId, 'email_notifications')) {
          return {
            allowed: false,
            reason: 'Les notifications email automatiques nécessitent un plan Premium ou Enterprise.',
            upgradeRequired: true,
          };
        }
        break;
        
      case 'advanced_features':
        if (status.plan === 'basic') {
          return {
            allowed: false,
            reason: 'Cette fonctionnalité avancée nécessite un plan Premium ou Enterprise.',
            upgradeRequired: true,
          };
        }
        break;
        
      case 'enterprise_features':
        if (status.plan !== 'enterprise') {
          return {
            allowed: false,
            reason: 'Cette fonctionnalité nécessite le plan Enterprise.',
            upgradeRequired: true,
          };
        }
        break;
    }

    return { allowed: true };
  }

  async blockAccessIfExpired(firmId: string): Promise<{ blocked: boolean; reason?: string }> {
    const status = await this.checkSubscriptionStatus(firmId);
    
    if (!status.canUseFeatures) {
      return {
        blocked: true,
        reason: status.isInGracePeriod 
          ? `Votre abonnement a expiré. Période de grâce: ${this.gracePeriodDays + status.daysRemaining} jour(s) restant(s).`
          : 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser l\'application.'
      };
    }

    return { blocked: false };
  }

  async checkAndNotifyExpiration(): Promise<void> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('subscription_status', ['active', 'expired'])
        .not('subscription_expires_at', 'is', null);

      if (error || !profiles) return;

      const now = new Date();
      
      for (const profile of profiles) {
        const expiresAt = new Date(profile.subscription_expires_at);
        const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send notifications at 7 days, 3 days, 1 day before and on expiration
        if ([7, 3, 1, 0].includes(daysUntilExpiration) && profile.subscription_status === 'active') {
          await this.sendExpirationNotification(profile, daysUntilExpiration);
        }

        // Handle expired subscriptions
        if (daysUntilExpiration < -this.gracePeriodDays && profile.subscription_status !== 'blocked') {
          await this.blockExpiredSubscription(profile.id, profile.firm_name);
        }
      }
    } catch (error) {
      console.error('Error checking subscription expiration:', error);
    }
  }

  private async sendExpirationNotification(profile: any, daysUntilExpiration: number): Promise<void> {
    try {
      const messages = {
        7: 'Votre abonnement expire dans 7 jours. Renouvelez maintenant pour éviter toute interruption.',
        3: 'Votre abonnement expire dans 3 jours. Renouvelez dès maintenant!',
        1: 'URGENT: Votre abonnement expire demain. Renouvelez immédiatement!',
        0: 'Votre abonnement expire aujourd\'hui. Renouvelez maintenant pour maintenir l\'accès.',
      };

      await this.notificationService.sendNotification({
        firmId: profile.id,
        type: 'subscription_expiring',
        channels: ['email', 'in_app'],
        recipients: [{
          email: profile.email || '',
          name: profile.firm_name,
        }],
        data: {
          firmName: profile.firm_name,
          expirationDate: new Date(profile.subscription_expires_at).toLocaleDateString('fr-FR'),
          planName: profile.subscription_plan,
          daysRemaining: daysUntilExpiration,
          message: messages[daysUntilExpiration as keyof typeof messages],
        },
      });
    } catch (error) {
      console.error('Error sending expiration notification:', error);
    }
  }

  private async blockExpiredSubscription(firmId: string, firmName: string): Promise<void> {
    try {
      // Update subscription status to blocked
      await supabase
        .from('profiles')
        .update({ subscription_status: 'blocked' })
        .eq('id', firmId);

      console.log(`Subscription blocked for firm ${firmId} (${firmName}) - grace period exceeded`);
    } catch (error) {
      console.error('Error blocking expired subscription:', error);
    }
  }

  async renewSubscription(firmId: string, plan: 'basic' | 'premium' | 'enterprise'): Promise<{ success: boolean; error?: string }> {
    try {
      const newExpirationDate = new Date();
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 1); // Add 1 month

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: newExpirationDate.toISOString(),
        })
        .eq('id', firmId);

      if (error) {
        throw error;
      }

      // Send renewal confirmation
      await this.notificationService.sendNotification({
        firmId,
        type: 'subscription_renewed',
        channels: ['email', 'in_app'],
        recipients: [{ email: '', name: '' }], // Will be populated by notification service
        data: {
          planName: plan,
          expirationDate: newExpirationDate.toLocaleDateString('fr-FR'),
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error renewing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  private getPlanLimits(plan: 'basic' | 'premium' | 'enterprise' | null) {
    const limits = {
      basic: {
        maxCases: 10,
        maxClients: 25,
        maxDocuments: 50,
      },
      premium: {
        maxCases: 500,
        maxClients: 1000,
        maxDocuments: 5000,
      },
      enterprise: {
        maxCases: 'unlimited' as const,
        maxClients: 'unlimited' as const,
        maxDocuments: 'unlimited' as const,
      },
    };

    return limits[plan || 'basic'];
  }

  // Feature availability checker
  async hasFeature(firmId: string, feature: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status')
        .eq('id', firmId)
        .single();

      if (!profile || profile.subscription_status !== 'active') {
        return false;
      }

      const plan = profile.subscription_plan as 'basic' | 'premium' | 'enterprise';
      const features = this.getPlanFeatures(plan);
      
      return features.includes(feature);
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  }

  private getPlanFeatures(plan: 'basic' | 'premium' | 'enterprise'): string[] {
    const features = {
      basic: [
        'basic_case_management',
        'basic_client_management',
        'basic_calendar',
        'basic_documents',
        'email_support',
      ],
      premium: [
        'basic_case_management',
        'basic_client_management',
        'basic_calendar',
        'basic_documents',
        'advanced_case_management',
        'advanced_client_management',
        'advanced_calendar',
        'advanced_documents',
        'document_automation',
        'whatsapp_notifications',
        'email_notifications',
        'priority_support',
        'billing_management',
        'advanced_search',
        'case_templates',
        'client_portal',
        'time_tracking',
        'invoice_generation',
      ],
      enterprise: [
        'basic_case_management',
        'basic_client_management',
        'basic_calendar',
        'basic_documents',
        'advanced_case_management',
        'advanced_client_management',
        'advanced_calendar',
        'advanced_documents',
        'document_automation',
        'whatsapp_notifications',
        'email_notifications',
        'priority_support',
        'billing_management',
        'advanced_search',
        'case_templates',
        'client_portal',
        'time_tracking',
        'invoice_generation',
        'multi_user_management',
        'advanced_reporting',
        'api_access',
        'custom_integrations',
        'dedicated_support',
        'advanced_security',
        'audit_logs',
        'white_labeling',
        'custom_workflows',
        'bulk_operations',
        'advanced_analytics',
        'compliance_tools',
      ],
    };

    return features[plan] || features.basic;
  }

  // Get plan pricing
  getPlanPricing() {
    return {
      basic: { price: 15000, currency: 'FCFA', period: 'mois' },
      premium: { price: 35000, currency: 'FCFA', period: 'mois' },
      enterprise: { price: 75000, currency: 'FCFA', period: 'mois' },
    };
  }

  // Utility method to start background monitoring
  startSubscriptionMonitoring(): void {
    // Check for expiring subscriptions every hour
    setInterval(async () => {
      await this.checkAndNotifyExpiration();
    }, 60 * 60 * 1000);

    console.log('Subscription monitoring started - checking every hour');
  }

  // Method to check if user needs to be blocked from specific actions
  async shouldBlockAction(firmId: string, action: string): Promise<boolean> {
    const access = await this.enforceSubscriptionAccess(firmId, action);
    return !access.allowed;
  }

  // Get user's current plan limits for display
  async getCurrentPlanLimits(firmId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', firmId)
      .single();

    return this.getPlanLimits(profile?.subscription_plan as 'basic' | 'premium' | 'enterprise');
  }
}

export default SubscriptionService;
