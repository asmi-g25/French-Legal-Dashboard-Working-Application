import { supabase } from '@/integrations/supabase/client';
import NotificationService from './notificationService';
import WhatsAppService from './whatsappService';
import EmailService from './emailService';

export interface PaymentStatus {
  isCurrentMonthPaid: boolean;
  paymentDue: boolean;
  daysOverdue: number;
  nextPaymentDate: string | null;
  lastPaymentDate: string | null;
  accessBlocked: boolean;
  gracePeriodRemaining: number;
  currentPlan: string | null;
  monthlyAmount: number;
}

class PaymentValidationService {
  private notificationService: NotificationService;
  private whatsappService: WhatsAppService;
  private emailService: EmailService;
  private gracePeriodDays = 3; // Grace period after payment due

  constructor() {
    this.notificationService = new NotificationService();
    this.whatsappService = new WhatsAppService();
    this.emailService = new EmailService();
  }

  async checkPaymentStatus(firmId: string): Promise<PaymentStatus> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firmId)
        .single();

      if (error || !profile) {
        return this.getDefaultPaymentStatus();
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Check for current month payment
      const { data: currentPayment } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('firm_id', firmId)
        .eq('status', 'paid')
        .gte('period_start', new Date(currentYear, currentMonth, 1).toISOString())
        .lte('period_end', new Date(currentYear, currentMonth + 1, 0).toISOString())
        .single();

      // Get last payment
      const { data: lastPayment } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('firm_id', firmId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .single();

      const isCurrentMonthPaid = !!currentPayment;
      const subscriptionExpiresAt = profile.subscription_expires_at 
        ? new Date(profile.subscription_expires_at) 
        : null;

      let paymentDue = false;
      let daysOverdue = 0;
      let accessBlocked = false;
      let gracePeriodRemaining = this.gracePeriodDays;

      if (subscriptionExpiresAt) {
        const timeDiff = subscriptionExpiresAt.getTime() - now.getTime();
        daysOverdue = -Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        paymentDue = daysOverdue >= 0;
        
        if (paymentDue) {
          gracePeriodRemaining = Math.max(0, this.gracePeriodDays - daysOverdue);
          accessBlocked = daysOverdue > this.gracePeriodDays;
        }
      }

      // Calculate next payment date (1st of next month)
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      
      return {
        isCurrentMonthPaid,
        paymentDue,
        daysOverdue: Math.max(0, daysOverdue),
        nextPaymentDate: nextMonth.toISOString(),
        lastPaymentDate: lastPayment?.paid_at || null,
        accessBlocked,
        gracePeriodRemaining,
        currentPlan: profile.subscription_plan,
        monthlyAmount: this.getPlanAmount(profile.subscription_plan),
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return this.getDefaultPaymentStatus();
    }
  }

  private getDefaultPaymentStatus(): PaymentStatus {
    return {
      isCurrentMonthPaid: false,
      paymentDue: true,
      daysOverdue: 999,
      nextPaymentDate: null,
      lastPaymentDate: null,
      accessBlocked: true,
      gracePeriodRemaining: 0,
      currentPlan: null,
      monthlyAmount: 0,
    };
  }

  private getPlanAmount(plan: string | null): number {
    const planAmounts = {
      basic: 15000,
      premium: 35000,
      enterprise: 75000,
    };
    return planAmounts[plan as keyof typeof planAmounts] || 0;
  }

  async blockAccessIfPaymentOverdue(firmId: string): Promise<{ blocked: boolean; reason?: string; status?: PaymentStatus }> {
    const paymentStatus = await this.checkPaymentStatus(firmId);
    
    if (paymentStatus.accessBlocked) {
      return {
        blocked: true,
        reason: `Votre abonnement a expiré depuis ${paymentStatus.daysOverdue} jour(s). Renouvelez votre paiement pour continuer.`,
        status: paymentStatus,
      };
    }

    if (paymentStatus.paymentDue && paymentStatus.gracePeriodRemaining > 0) {
      return {
        blocked: false,
        reason: `Paiement en retard. Période de grâce: ${paymentStatus.gracePeriodRemaining} jour(s) restant(s).`,
        status: paymentStatus,
      };
    }

    return { blocked: false, status: paymentStatus };
  }

  async sendPaymentReminders(): Promise<void> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('subscription_status', ['active', 'expired'])
        .not('subscription_expires_at', 'is', null);

      if (error || !profiles) return;

      for (const profile of profiles) {
        const paymentStatus = await this.checkPaymentStatus(profile.id);
        
        // Send reminders at different intervals
        if (paymentStatus.paymentDue) {
          await this.sendPaymentReminderNotifications(profile, paymentStatus);
        }
        
        // Block access if overdue beyond grace period
        if (paymentStatus.accessBlocked && profile.subscription_status !== 'blocked') {
          await this.blockAccount(profile.id, profile.firm_name);
        }
      }
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }

  private async sendPaymentReminderNotifications(profile: any, paymentStatus: PaymentStatus): Promise<void> {
    try {
      const urgencyLevel = this.getUrgencyLevel(paymentStatus.daysOverdue);
      const message = this.getPaymentReminderMessage(paymentStatus, profile.firm_name);

      // Send email notification
      if (profile.email) {
        await this.emailService.sendPaymentReminderEmail(
          profile.email,
          profile.firm_name,
          `SUB-${new Date().getFullYear()}-${profile.id.slice(0, 8)}`,
          paymentStatus.monthlyAmount,
          paymentStatus.daysOverdue,
          'Votre Cabinet Juridique'
        );
      }

      // Send WhatsApp notification if phone available
      if (profile.phone) {
        await this.whatsappService.sendPaymentReminder(
          profile.phone,
          profile.firm_name,
          paymentStatus.monthlyAmount,
          `SUB-${new Date().getFullYear()}-${profile.id.slice(0, 8)}`
        );
      }

      // Send in-app notification
      await this.notificationService.sendNotification({
        firmId: profile.id,
        type: urgencyLevel === 'critical' ? 'payment_overdue_critical' : 'payment_reminder',
        channels: ['in_app'],
        recipients: [{
          email: profile.email || '',
          name: profile.firm_name,
        }],
        data: {
          firmName: profile.firm_name,
          amount: paymentStatus.monthlyAmount,
          daysOverdue: paymentStatus.daysOverdue,
          gracePeriodRemaining: paymentStatus.gracePeriodRemaining,
          planName: paymentStatus.currentPlan,
          message: message,
        },
      });

      console.log(`Payment reminder sent to firm ${profile.id} (${profile.firm_name}) - ${paymentStatus.daysOverdue} days overdue`);
    } catch (error) {
      console.error('Error sending payment reminder notifications:', error);
    }
  }

  private getUrgencyLevel(daysOverdue: number): 'normal' | 'urgent' | 'critical' {
    if (daysOverdue >= this.gracePeriodDays) return 'critical';
    if (daysOverdue >= 1) return 'urgent';
    return 'normal';
  }

  private getPaymentReminderMessage(paymentStatus: PaymentStatus, firmName: string): string {
    if (paymentStatus.accessBlocked) {
      return `URGENT: Votre abonnement de ${firmName} a expiré depuis ${paymentStatus.daysOverdue} jour(s). L'accès est maintenant bloqué. Renouvelez immédiatement.`;
    }
    
    if (paymentStatus.gracePeriodRemaining > 0) {
      return `Votre abonnement de ${firmName} a expiré. Période de grâce: ${paymentStatus.gracePeriodRemaining} jour(s) restant(s). Renouvelez maintenant.`;
    }
    
    return `Rappel: Votre paiement mensuel de ${paymentStatus.monthlyAmount.toLocaleString()} FCFA est dû pour ${firmName}.`;
  }

  private async blockAccount(firmId: string, firmName: string): Promise<void> {
    try {
      // Update subscription status to blocked
      await supabase
        .from('profiles')
        .update({ subscription_status: 'blocked' })
        .eq('id', firmId);

      console.log(`Account blocked for firm ${firmId} (${firmName}) due to payment overdue`);
    } catch (error) {
      console.error('Error blocking account:', error);
    }
  }

  async processSuccessfulPayment(firmId: string, plan: string, transactionId: string, amount: number): Promise<void> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const subscriptionExpiry = new Date(now.getFullYear(), now.getMonth() + 1, periodEnd.getDate());

      // Create payment record
      await supabase
        .from('subscription_payments')
        .insert({
          firm_id: firmId,
          plan_name: plan,
          amount: amount,
          currency: 'FCFA',
          billing_period: 'monthly',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: 'paid',
          paid_at: now.toISOString(),
        });

      // Update profile subscription
      await supabase
        .from('profiles')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_expires_at: subscriptionExpiry.toISOString(),
          subscription_started_at: now.toISOString(),
        })
        .eq('id', firmId);

      // Send confirmation notifications
      await this.sendPaymentConfirmation(firmId, plan, amount);

      console.log(`Payment processed successfully for firm ${firmId}: ${plan} plan, ${amount} FCFA`);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  private async sendPaymentConfirmation(firmId: string, plan: string, amount: number): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firmId)
        .single();

      if (!profile) return;

      await this.notificationService.sendNotification({
        firmId,
        type: 'payment_successful',
        channels: ['email', 'in_app'],
        recipients: [{
          email: profile.email || '',
          name: profile.firm_name,
        }],
        data: {
          firmName: profile.firm_name,
          planName: plan,
          amount: amount,
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
        },
      });
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  // Method to check if specific features require payment
  async requiresPaymentForFeature(firmId: string, feature: string): Promise<boolean> {
    const paymentStatus = await this.checkPaymentStatus(firmId);
    
    // Block all premium features if payment is overdue
    if (paymentStatus.accessBlocked) {
      return true;
    }

    // During grace period, allow basic features but warn about premium features
    if (paymentStatus.paymentDue && ['whatsapp_notifications', 'email_notifications', 'advanced_features'].includes(feature)) {
      return true;
    }

    return false;
  }

  // Start the payment monitoring service
  startPaymentMonitoring(): void {
    // Check payments every 4 hours
    setInterval(async () => {
      await this.sendPaymentReminders();
    }, 4 * 60 * 60 * 1000);

    // Daily payment status check at 9 AM
    const scheduleDaily = () => {
      const now = new Date();
      const next9AM = new Date();
      next9AM.setHours(9, 0, 0, 0);
      
      if (next9AM <= now) {
        next9AM.setDate(next9AM.getDate() + 1);
      }
      
      const timeUntil9AM = next9AM.getTime() - now.getTime();
      
      setTimeout(() => {
        this.sendPaymentReminders();
        
        // Then repeat every 24 hours
        setInterval(async () => {
          await this.sendPaymentReminders();
        }, 24 * 60 * 60 * 1000);
      }, timeUntil9AM);
    };

    scheduleDaily();
    console.log('Payment monitoring service started - checking every 4 hours and daily at 9 AM');
  }

  // Utility method to get payment status for UI display
  async getPaymentStatusForUI(firmId: string) {
    const paymentStatus = await this.checkPaymentStatus(firmId);
    
    return {
      ...paymentStatus,
      statusText: this.getStatusText(paymentStatus),
      statusColor: this.getStatusColor(paymentStatus),
      actionRequired: paymentStatus.paymentDue || paymentStatus.accessBlocked,
    };
  }

  private getStatusText(status: PaymentStatus): string {
    if (status.accessBlocked) {
      return `Accès bloqué - ${status.daysOverdue} jour(s) de retard`;
    }
    
    if (status.paymentDue) {
      return `Paiement en retard - ${status.gracePeriodRemaining} jour(s) de grâce`;
    }
    
    if (status.isCurrentMonthPaid) {
      return 'Paiement à jour';
    }
    
    return 'Statut inconnu';
  }

  private getStatusColor(status: PaymentStatus): 'green' | 'yellow' | 'red' {
    if (status.accessBlocked) return 'red';
    if (status.paymentDue) return 'yellow';
    if (status.isCurrentMonthPaid) return 'green';
    return 'red';
  }
}

export default PaymentValidationService;
