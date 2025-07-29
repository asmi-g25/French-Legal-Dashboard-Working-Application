import axios from 'axios';

export interface EmailMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  template?: string;
  templateData?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
  contentType: string;
  disposition?: 'attachment' | 'inline';
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

class EmailService {
  private apiUrl: string;
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private enabled: boolean;

  constructor() {
    // Use environment variables for email service configuration
    this.apiUrl = import.meta.env.VITE_EMAIL_API_URL || 'https://api.emailservice.com/v1/send';
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_EMAIL_FROM_ADDRESS || 'noreply@lawfirm.com';
    this.fromName = import.meta.env.VITE_EMAIL_FROM_NAME || 'Cabinet d\'Avocat';
    this.enabled = import.meta.env.VITE_EMAIL_ENABLED === 'true';
  }

  async sendEmail(message: EmailMessage, firmId?: string): Promise<EmailResponse> {
    if (!this.enabled) {
      console.log('Email service is disabled');
      return { success: false, error: 'Email service is disabled' };
    }

    if (!this.apiKey) {
      console.error('Email API credentials not configured');
      return { success: false, error: 'Email API credentials not configured' };
    }

    try {
      // Prepare email data
      const emailData = {
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        to: Array.isArray(message.to) ? 
          message.to.map(email => ({ email })) : 
          [{ email: message.to }],
        cc: message.cc?.map(email => ({ email })) || [],
        bcc: message.bcc?.map(email => ({ email })) || [],
        subject: message.subject,
        html: message.html || '',
        text: message.text || '',
        attachments: message.attachments || [],
        template: message.template,
        templateData: message.templateData,
        tags: [
          'law-firm',
          firmId ? `firm-${firmId}` : 'system',
        ],
      };

      const response = await axios.post(
        this.apiUrl,
        emailData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          messageId: response.data.id || response.data.messageId,
          details: response.data,
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: response.data,
        };
      }
    } catch (error: any) {
      console.error('Email API Error:', error);
      
      if (error.response) {
        return {
          success: false,
          error: `API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`,
          details: error.response.data,
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Network error: Unable to reach email service',
        };
      } else {
        return {
          success: false,
          error: `Request error: ${error.message}`,
        };
      }
    }
  }

  // Business-specific email templates and methods
  async sendWelcomeEmail(clientEmail: string, clientName: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateWelcomeEmailHTML(clientName, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Bienvenue chez ${firmName}`,
      html,
      text: `Bienvenue ${clientName}, nous sommes ravis de vous compter parmi nos clients chez ${firmName}.`,
    }, firmId);
  }

  async sendCaseUpdateEmail(clientEmail: string, clientName: string, caseName: string, update: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateCaseUpdateEmailHTML(clientName, caseName, update, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Mise à jour de votre dossier: ${caseName}`,
      html,
      text: `Bonjour ${clientName}, votre dossier "${caseName}" a été mis à jour: ${update}`,
    }, firmId);
  }

  async sendAppointmentReminderEmail(clientEmail: string, clientName: string, appointmentDate: string, appointmentTime: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateAppointmentReminderEmailHTML(clientName, appointmentDate, appointmentTime, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Rappel de rendez-vous - ${appointmentDate}`,
      html,
      text: `Bonjour ${clientName}, nous vous rappelons votre rendez-vous le ${appointmentDate} à ${appointmentTime}.`,
    }, firmId);
  }

  async sendInvoiceEmail(clientEmail: string, clientName: string, invoiceNumber: string, amount: number, dueDate: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateInvoiceEmailHTML(clientName, invoiceNumber, amount, dueDate, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Facture #${invoiceNumber} - ${firmName}`,
      html,
      text: `Bonjour ${clientName}, veuillez trouver votre facture #${invoiceNumber} d'un montant de ${amount.toLocaleString()} FCFA, échéance le ${dueDate}.`,
    }, firmId);
  }

  async sendDocumentReadyEmail(clientEmail: string, clientName: string, documentName: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateDocumentReadyEmailHTML(clientName, documentName, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Document prêt: ${documentName}`,
      html,
      text: `Bonjour ${clientName}, votre document "${documentName}" est prêt pour récupération.`,
    }, firmId);
  }

  async sendCourtDateNotificationEmail(clientEmail: string, clientName: string, courtDate: string, courtTime: string, courtLocation: string, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generateCourtDateEmailHTML(clientName, courtDate, courtTime, courtLocation, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Convocation au tribunal - ${courtDate}`,
      html,
      text: `Bonjour ${clientName}, vous êtes convoqué(e) au tribunal le ${courtDate} à ${courtTime} à ${courtLocation}.`,
    }, firmId);
  }

  async sendPaymentReminderEmail(clientEmail: string, clientName: string, invoiceNumber: string, amount: number, daysOverdue: number, firmName: string, firmId?: string): Promise<EmailResponse> {
    const html = this.generatePaymentReminderEmailHTML(clientName, invoiceNumber, amount, daysOverdue, firmName);
    
    return this.sendEmail({
      to: clientEmail,
      subject: `Rappel de paiement - Facture #${invoiceNumber}`,
      html,
      text: `Bonjour ${clientName}, nous vous rappelons que le paiement de la facture #${invoiceNumber} de ${amount.toLocaleString()} FCFA est en retard de ${daysOverdue} jours.`,
    }, firmId);
  }

  // Email template generators
  private generateWelcomeEmailHTML(clientName: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Bienvenue chez ${firmName}</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Nous sommes ravis de vous accueillir parmi nos clients. Notre équipe est dédiée à vous fournir 
            les meilleurs services juridiques et à vous accompagner dans toutes vos démarches.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Ce que vous pouvez attendre de nous :</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Un suivi personnalisé de vos dossiers</li>
              <li>Une communication transparente et régulière</li>
              <li>Une expertise juridique de qualité</li>
              <li>Une disponibilité pour répondre à vos questions</li>
            </ul>
          </div>
          <p style="color: #666; line-height: 1.6;">
            N'hésitez pas à nous contacter pour toute question ou préoccupation. Nous sommes là pour vous aider.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>L'équipe de ${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateCaseUpdateEmailHTML(clientName: string, caseName: string, update: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📁 Mise à jour de votre dossier</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4facfe;">
            <h3 style="color: #333; margin-top: 0;">Dossier : ${caseName}</h3>
            <p style="color: #666; line-height: 1.6; font-size: 16px; background: #f0f8ff; padding: 15px; border-radius: 6px;">
              ${update}
            </p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Si vous avez des questions concernant cette mise à jour, n'hésitez pas à nous contacter.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateAppointmentReminderEmailHTML(clientName: string, appointmentDate: string, appointmentTime: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📅 Rappel de rendez-vous</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Nous vous rappelons votre rendez-vous prévu :
          </p>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fa709a; text-align: center;">
            <h3 style="color: #333; margin: 0 0 15px 0;">📅 ${appointmentDate}</h3>
            <h3 style="color: #333; margin: 0;">🕐 ${appointmentTime}</h3>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Merci de confirmer votre présence et de nous prévenir en cas d'empêchement.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateInvoiceEmailHTML(clientName: string, invoiceNumber: string, amount: number, dueDate: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💰 Facture #${invoiceNumber}</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Veuillez trouver ci-joint votre facture :
          </p>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666;">Numéro de facture :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333;">#${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Montant :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333; font-size: 18px;">${amount.toLocaleString()} FCFA</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Échéance :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #e74c3c;">${dueDate}</td>
              </tr>
            </table>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Merci de procéder au règlement avant la date d'échéance. Pour toute question, n'hésitez pas à nous contacter.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateDocumentReadyEmailHTML(clientName: string, documentName: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📄 Document prêt</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Nous avons le plaisir de vous informer que votre document est prêt :
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e; text-align: center;">
            <h3 style="color: #333; margin: 0;">📄 ${documentName}</h3>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Vous pouvez passer récupérer ce document à notre cabinet ou nous contacter pour convenir des modalités de récupération.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateCourtDateEmailHTML(clientName: string, courtDate: string, courtTime: string, courtLocation: string, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e43a15 0%, #e65245 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚖️ Convocation au tribunal</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <div style="background: #ffe6e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e43a15;">
            <h3 style="color: #d63031; margin-top: 0;">⚠️ IMPORTANT - Convocation obligatoire</h3>
            <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0;">
              Vous êtes convoqué(e) au tribunal selon les modalités suivantes :
            </p>
          </div>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px 0; color: #666; font-weight: bold;">📅 Date :</td>
                <td style="padding: 15px 0; color: #333; font-size: 18px;">${courtDate}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; color: #666; font-weight: bold;">🕐 Heure :</td>
                <td style="padding: 15px 0; color: #333; font-size: 18px;">${courtTime}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; color: #666; font-weight: bold;">📍 Lieu :</td>
                <td style="padding: 15px 0; color: #333;">${courtLocation}</td>
              </tr>
            </table>
          </div>
          <p style="color: #666; line-height: 1.6;">
            <strong>Votre présence est obligatoire.</strong> Contactez-nous immédiatement si vous avez des questions ou en cas d'empêchement.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generatePaymentReminderEmailHTML(clientName: string, invoiceNumber: string, amount: number, daysOverdue: number, firmName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💰 Rappel de paiement</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Bonjour ${clientName},</h2>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffa500;">
            <p style="color: #856404; line-height: 1.6; font-size: 16px; margin: 0;">
              <strong>⚠️ Paiement en retard :</strong> ${daysOverdue} jour(s)
            </p>
          </div>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666;">Facture :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333;">#${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Montant dû :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #e74c3c; font-size: 18px;">${amount.toLocaleString()} FCFA</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Retard :</td>
                <td style="padding: 10px 0; font-weight: bold; color: #e74c3c;">${daysOverdue} jour(s)</td>
              </tr>
            </table>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Nous vous rappelons que le paiement de cette facture est en retard. Merci de régulariser votre situation dans les plus brefs délais.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Pour toute question ou difficulté de paiement, contactez-nous pour trouver une solution.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 14px;">
              Cordialement,<br>
              <strong>${firmName}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Test email service
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return { success: false, message: 'Email service is disabled' };
    }

    if (!this.apiKey) {
      return { success: false, message: 'Email API credentials not configured' };
    }

    try {
      const testResult = await this.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email Service Connection',
        text: 'This is a test email to verify the email service configuration.',
        html: '<p>This is a test email to verify the email service configuration.</p>',
      });

      return {
        success: testResult.success,
        message: testResult.success ? 'Email service connection successful' : testResult.error || 'Connection failed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
      };
    }
  }

  // Check if email service is properly configured
  isConfigured(): boolean {
    return this.enabled && !!this.apiKey && !!this.fromEmail;
  }

  // Get service status
  getStatus() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
    };
  }
}

export default EmailService;
