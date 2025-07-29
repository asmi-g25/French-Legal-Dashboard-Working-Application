import { supabase } from '@/integrations/supabase/client';
import WhatsAppService from './whatsappService';
import EmailService from './emailService';
import SMSService from './smsService';

export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'in_app';
export type NotificationType = 
  | 'appointment_reminder'
  | 'case_update' 
  | 'payment_reminder'
  | 'document_ready'
  | 'welcome'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'invoice_sent'
  | 'payment_received';

export interface NotificationData {
  firmId: string;
  caseId?: string;
  clientId?: string;
  type: NotificationType;
  channels: NotificationChannel[];
  recipients: {
    email?: string;
    phone?: string;
    name: string;
  }[];
  data: Record<string, any>;
  scheduledAt?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationTemplate {
  type: NotificationType;
  name: string;
  description: string;
  channels: NotificationChannel[];
  requiredData: string[];
  templates: {
    email?: {
      subject: string;
      html: string;
    };
    whatsapp?: {
      text: string;
    };
    sms?: {
      text: string;
    };
  };
}

class NotificationService {
  private whatsappService: WhatsAppService;
  private emailService: EmailService;
  private smsService: SMSService;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  async sendNotification(notification: NotificationData): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    let success = true;

    try {
      // Log notification in database
      const { data: notificationRecord, error: logError } = await supabase
        .from('notifications')
        .insert({
          firm_id: notification.firmId,
          case_id: notification.caseId,
          type: notification.type,
          title: this.getNotificationTitle(notification.type),
          message: JSON.stringify(notification.data),
          channel: notification.channels.join(','),
          recipient: notification.recipients.map(r => r.email || r.phone).join(','),
          status: 'pending',
          scheduled_at: notification.scheduledAt?.toISOString(),
          metadata: notification.data,
        })
        .select()
        .single();

      if (logError) {
        console.error('Error logging notification:', logError);
      }

      // Send to each recipient on each channel
      for (const recipient of notification.recipients) {
        for (const channel of notification.channels) {
          try {
            let result;
            
            switch (channel) {
              case 'email':
                if (recipient.email) {
                  result = await this.sendEmailNotification(notification, recipient);
                }
                break;
              
              case 'whatsapp':
                if (recipient.phone) {
                  result = await this.sendWhatsAppNotification(notification, recipient);
                }
                break;
              
              case 'sms':
                if (recipient.phone) {
                  result = await this.sendSMSNotification(notification, recipient);
                }
                break;
              
              case 'in_app':
                result = await this.sendInAppNotification(notification, recipient);
                break;
            }

            if (result) {
              results.push({
                channel,
                recipient: recipient.email || recipient.phone,
                success: result.success,
                messageId: result.messageId,
                error: result.error,
              });

              if (!result.success) {
                success = false;
              }
            }
          } catch (error: any) {
            results.push({
              channel,
              recipient: recipient.email || recipient.phone,
              success: false,
              error: error.message,
            });
            success = false;
          }
        }
      }

      // Update notification status
      if (notificationRecord) {
        await supabase
          .from('notifications')
          .update({
            status: success ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            metadata: { ...notification.data, results },
          })
          .eq('id', notificationRecord.id);
      }

      return { success, results };
    } catch (error: any) {
      console.error('Notification service error:', error);
      return { success: false, results: [{ error: error.message }] };
    }
  }

  private async sendEmailNotification(notification: NotificationData, recipient: { email?: string; name: string }): Promise<any> {
    if (!recipient.email) return null;

    const template = this.getTemplate(notification.type);
    if (!template.templates.email) return null;

    const subject = this.processTemplate(template.templates.email.subject, notification.data);
    const html = this.processTemplate(template.templates.email.html, notification.data);

    return await this.emailService.sendEmail({
      to: recipient.email,
      subject,
      html,
    }, notification.firmId);
  }

  private async sendWhatsAppNotification(notification: NotificationData, recipient: { phone?: string; name: string }): Promise<any> {
    if (!recipient.phone) return null;

    const template = this.getTemplate(notification.type);
    if (!template.templates.whatsapp) return null;

    const text = this.processTemplate(template.templates.whatsapp.text, notification.data);

    return await this.whatsappService.sendTextMessage(recipient.phone, text, notification.firmId);
  }

  private async sendSMSNotification(notification: NotificationData, recipient: { phone?: string; name: string }): Promise<any> {
    if (!recipient.phone) return null;

    const template = this.getTemplate(notification.type);
    if (!template.templates.sms) return null;

    const text = this.processTemplate(template.templates.sms.text, notification.data);

    return await this.smsService.sendSMS({
      to: recipient.phone,
      message: text,
    }, notification.firmId);
  }

  private async sendInAppNotification(notification: NotificationData, recipient: { name: string }): Promise<any> {
    // In-app notification implementation
    // This could involve real-time updates, push notifications, etc.
    return {
      success: true,
      messageId: `app_${Date.now()}`,
      details: 'In-app notification sent',
    };
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    }
    
    return processed;
  }

  private getNotificationTitle(type: NotificationType): string {
    const titles = {
      appointment_reminder: 'Rappel de rendez-vous',
      case_update: 'Mise à jour de dossier',
      payment_reminder: 'Rappel de paiement',
      document_ready: 'Document prêt',
      welcome: 'Bienvenue',
      subscription_expiring: 'Abonnement bientôt expiré',
      subscription_expired: 'Abonnement expiré',
      invoice_sent: 'Facture envoyée',
      payment_received: 'Paiement reçu',
    };
    
    return titles[type] || 'Notification';
  }

  private getTemplate(type: NotificationType): NotificationTemplate {
    const templates: Record<NotificationType, NotificationTemplate> = {
      appointment_reminder: {
        type: 'appointment_reminder',
        name: 'Rappel de rendez-vous',
        description: 'Rappel automatique de rendez-vous',
        channels: ['email', 'whatsapp', 'sms'],
        requiredData: ['clientName', 'appointmentDate', 'appointmentTime', 'firmName'],
        templates: {
          email: {
            subject: 'Rappel - Rendez-vous du {{appointmentDate}}',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Rappel de Rendez-vous</h2>
                <p>Bonjour {{clientName}},</p>
                <p>Nous vous rappelons que vous avez un rendez-vous le <strong>{{appointmentDate}} à {{appointmentTime}}</strong>.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                  <h3 style="margin: 0; color: #007bff;">Détails du rendez-vous</h3>
                  <p><strong>Date :</strong> {{appointmentDate}}</p>
                  <p><strong>Heure :</strong> {{appointmentTime}}</p>
                  <p><strong>Cabinet :</strong> {{firmName}}</p>
                </div>
                <p>Merci de confirmer votre présence.</p>
                <p>Cordialement,<br>L'équipe de {{firmName}}</p>
              </div>
            `,
          },
          whatsapp: {
            text: 'Bonjour {{clientName}}, rappel de votre rendez-vous le {{appointmentDate}} à {{appointmentTime}}. Merci de confirmer votre présence. - {{firmName}}',
          },
          sms: {
            text: 'Rappel: RDV le {{appointmentDate}} à {{appointmentTime}}. Confirmez SVP. {{firmName}}',
          },
        },
      },
      
      case_update: {
        type: 'case_update',
        name: 'Mise à jour de dossier',
        description: 'Notification de mise à jour de dossier',
        channels: ['email', 'whatsapp'],
        requiredData: ['clientName', 'caseTitle', 'update', 'firmName'],
        templates: {
          email: {
            subject: 'Mise à jour de votre dossier : {{caseTitle}}',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Mise à jour de dossier</h2>
                <p>Bonjour {{clientName}},</p>
                <p>Mise à jour concernant votre dossier :</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                  <h3 style="margin: 0; color: #28a745;">{{caseTitle}}</h3>
                  <p style="margin-top: 10px;">{{update}}</p>
                </div>
                <p>Pour toute question, n'hésitez pas à nous contacter.</p>
                <p>Cordialement,<br>L'équipe de {{firmName}}</p>
              </div>
            `,
          },
          whatsapp: {
            text: 'Bonjour {{clientName}}, mise à jour de votre dossier "{{caseTitle}}": {{update}} - {{firmName}}',
          },
        },
      },

      payment_reminder: {
        type: 'payment_reminder',
        name: 'Rappel de paiement',
        description: 'Rappel de paiement de facture',
        channels: ['email', 'whatsapp', 'sms'],
        requiredData: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'firmName'],
        templates: {
          email: {
            subject: 'Rappel de paiement - Facture N° {{invoiceNumber}}',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Rappel de Paiement</h2>
                <p>Bonjour {{clientName}},</p>
                <p>Nous vous rappelons qu'une facture est en attente de paiement :</p>
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <h3 style="margin: 0; color: #856404;">Facture N° {{invoiceNumber}}</h3>
                  <p><strong>Montant :</strong> {{amount}}</p>
                  <p><strong>Date d'échéance :</strong> {{dueDate}}</p>
                </div>
                <p>Merci de procéder au règlement dans les plus brefs délais.</p>
                <p>Cordialement,<br>L'équipe de {{firmName}}</p>
              </div>
            `,
          },
          whatsapp: {
            text: 'Bonjour {{clientName}}, rappel de paiement pour la facture N° {{invoiceNumber}} ({{amount}}) échéance {{dueDate}}. Merci de régler. - {{firmName}}',
          },
          sms: {
            text: 'Rappel paiement facture {{invoiceNumber}} ({{amount}}) échéance {{dueDate}}. {{firmName}}',
          },
        },
      },

      subscription_expiring: {
        type: 'subscription_expiring',
        name: 'Abonnement bientôt expiré',
        description: 'Notification d\'expiration prochaine d\'abonnement',
        channels: ['email', 'in_app'],
        requiredData: ['firmName', 'expirationDate', 'planName'],
        templates: {
          email: {
            subject: 'Votre abonnement JURIS expire bientôt',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Renouvellement d'abonnement</h2>
                <p>Bonjour,</p>
                <p>Votre abonnement JURIS {{planName}} expire le <strong>{{expirationDate}}</strong>.</p>
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <h3 style="margin: 0; color: #856404;">Action requise</h3>
                  <p>Renouvelez votre abonnement pour continuer à utiliser toutes les fonctionnalités de JURIS.</p>
                </div>
                <p>Connectez-vous à votre compte pour renouveler.</p>
                <p>Cordialement,<br>L'équipe JURIS</p>
              </div>
            `,
          },
        },
      },

      subscription_expired: {
        type: 'subscription_expired',
        name: 'Abonnement expiré',
        description: 'Notification d\'abonnement expiré',
        channels: ['email', 'in_app'],
        requiredData: ['firmName', 'planName'],
        templates: {
          email: {
            subject: 'Votre abonnement JURIS a expiré',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">Abonnement expiré</h2>
                <p>Bonjour,</p>
                <p>Votre abonnement JURIS {{planName}} a expiré.</p>
                <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                  <h3 style="margin: 0; color: #721c24;">Accès limité</h3>
                  <p>Certaines fonctionnalités sont maintenant restreintes. Renouvelez votre abonnement pour restaurer l'accès complet.</p>
                </div>
                <p>Connectez-vous pour renouveler maintenant.</p>
                <p>Cordialement,<br>L'équipe JURIS</p>
              </div>
            `,
          },
        },
      },

      // Add other templates...
      document_ready: {
        type: 'document_ready',
        name: 'Document prêt',
        description: 'Notification de document prêt',
        channels: ['email', 'whatsapp'],
        requiredData: ['clientName', 'documentName', 'firmName'],
        templates: {
          email: {
            subject: 'Votre document est prêt : {{documentName}}',
            html: `<p>Bonjour {{clientName}}, votre document "{{documentName}}" est prêt. - {{firmName}}</p>`,
          },
          whatsapp: {
            text: 'Bonjour {{clientName}}, votre document "{{documentName}}" est prêt. Vous pouvez venir le récupérer. - {{firmName}}',
          },
        },
      },

      welcome: {
        type: 'welcome',
        name: 'Bienvenue',
        description: 'Message de bienvenue pour nouveaux clients',
        channels: ['email'],
        requiredData: ['clientName', 'firmName'],
        templates: {
          email: {
            subject: 'Bienvenue chez {{firmName}}',
            html: `<p>Bonjour {{clientName}}, bienvenue chez {{firmName}}. Nous sommes ravis de vous compter parmi nos clients.</p>`,
          },
        },
      },

      invoice_sent: {
        type: 'invoice_sent',
        name: 'Facture envoyée',
        description: 'Notification d\'envoi de facture',
        channels: ['email'],
        requiredData: ['clientName', 'invoiceNumber', 'amount', 'firmName'],
        templates: {
          email: {
            subject: 'Facture N° {{invoiceNumber}} - {{firmName}}',
            html: `<p>Bonjour {{clientName}}, veuillez trouver votre facture N° {{invoiceNumber}} d'un montant de {{amount}}.</p>`,
          },
        },
      },

      payment_received: {
        type: 'payment_received',
        name: 'Paiement reçu',
        description: 'Confirmation de réception de paiement',
        channels: ['email'],
        requiredData: ['clientName', 'amount', 'invoiceNumber', 'firmName'],
        templates: {
          email: {
            subject: 'Paiement reçu - Facture N° {{invoiceNumber}}',
            html: `<p>Bonjour {{clientName}}, nous confirmons la réception de votre paiement de {{amount}} pour la facture N° {{invoiceNumber}}.</p>`,
          },
        },
      },
    };

    return templates[type];
  }

  // Convenience methods for common notifications
  async sendAppointmentReminder(
    firmId: string,
    clientEmail: string,
    clientPhone: string,
    clientName: string,
    appointmentDate: string,
    appointmentTime: string,
    firmName: string,
    caseId?: string
  ) {
    return this.sendNotification({
      firmId,
      caseId,
      type: 'appointment_reminder',
      channels: ['email', 'whatsapp'],
      recipients: [{
        email: clientEmail,
        phone: clientPhone,
        name: clientName,
      }],
      data: {
        clientName,
        appointmentDate,
        appointmentTime,
        firmName,
      },
    });
  }

  async sendCaseUpdate(
    firmId: string,
    clientEmail: string,
    clientPhone: string,
    clientName: string,
    caseTitle: string,
    update: string,
    firmName: string,
    caseId?: string
  ) {
    return this.sendNotification({
      firmId,
      caseId,
      type: 'case_update',
      channels: ['email', 'whatsapp'],
      recipients: [{
        email: clientEmail,
        phone: clientPhone,
        name: clientName,
      }],
      data: {
        clientName,
        caseTitle,
        update,
        firmName,
      },
    });
  }

  async sendPaymentReminder(
    firmId: string,
    clientEmail: string,
    clientPhone: string,
    clientName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string,
    firmName: string
  ) {
    return this.sendNotification({
      firmId,
      type: 'payment_reminder',
      channels: ['email', 'whatsapp'],
      recipients: [{
        email: clientEmail,
        phone: clientPhone,
        name: clientName,
      }],
      data: {
        clientName,
        invoiceNumber,
        amount,
        dueDate,
        firmName,
      },
    });
  }

  static getTemplates(): NotificationTemplate[] {
    const service = new NotificationService();
    return Object.values(['appointment_reminder', 'case_update', 'payment_reminder', 'document_ready', 'welcome', 'subscription_expiring', 'subscription_expired', 'invoice_sent', 'payment_received'] as NotificationType[])
      .map(type => service.getTemplate(type));
  }
}

export default NotificationService;
