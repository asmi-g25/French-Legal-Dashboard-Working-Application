import axios from 'axios';

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., "+221701234567")
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;
  private instanceId: string;
  private enabled: boolean;

  constructor() {
    // Use environment variables for WhatsApp API configuration
    this.apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
    this.apiKey = import.meta.env.VITE_WHATSAPP_API_KEY || '';
    this.instanceId = import.meta.env.VITE_WHATSAPP_INSTANCE_ID || '';
    this.enabled = import.meta.env.VITE_WHATSAPP_ENABLED === 'true';
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.enabled) {
      console.log('WhatsApp service is disabled');
      return { success: false, error: 'WhatsApp service is disabled' };
    }

    if (!this.apiKey || !this.instanceId) {
      console.error('WhatsApp API credentials not configured');
      return { success: false, error: 'WhatsApp API credentials not configured' };
    }

    try {
      // Format phone number (ensure it starts with + and country code)
      const formattedPhone = this.formatPhoneNumber(message.to);
      
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Prepare request based on message type
      const requestData = message.type === 'template' && message.templateName 
        ? this.prepareTemplateMessage(formattedPhone, message.templateName, message.templateParams || [])
        : this.prepareTextMessage(formattedPhone, message.message);

      const response = await axios.post(
        `${this.apiUrl}`,
        requestData,
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
      console.error('WhatsApp API Error:', error);
      
      if (error.response) {
        return {
          success: false,
          error: `API Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`,
          details: error.response.data,
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Network error: Unable to reach WhatsApp API',
        };
      } else {
        return {
          success: false,
          error: `Request error: ${error.message}`,
        };
      }
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add default country code (Senegal: +221)
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('221') && cleaned.length === 12) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('7') && cleaned.length === 9) {
        cleaned = '+221' + cleaned;
      } else if (cleaned.length >= 8 && cleaned.length <= 12) {
        cleaned = '+221' + cleaned;
      } else {
        return null; // Invalid format
      }
    }

    // Validate international format
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null;
    }

    return cleaned;
  }

  private prepareTextMessage(to: string, message: string) {
    return {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'text',
      text: {
        body: message,
      },
    };
  }

  private prepareTemplateMessage(to: string, templateName: string, params: string[]) {
    return {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'fr',
        },
        components: params.length > 0 ? [
          {
            type: 'body',
            parameters: params.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ] : [],
      },
    };
  }

  // Business-specific notification methods
  async sendCaseUpdateNotification(clientPhone: string, caseName: string, update: string): Promise<WhatsAppResponse> {
    const message = `🏛️ *Mise à jour de votre dossier*\n\n` +
      `📁 Dossier: ${caseName}\n` +
      `📝 Mise à jour: ${update}\n\n` +
      `Votre cabinet d'avocat vous tient informé.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  async sendAppointmentReminder(clientPhone: string, clientName: string, appointmentDate: string, appointmentTime: string): Promise<WhatsAppResponse> {
    const message = `📅 *Rappel de rendez-vous*\n\n` +
      `Bonjour ${clientName},\n\n` +
      `Nous vous rappelons votre rendez-vous:\n` +
      `📅 Date: ${appointmentDate}\n` +
      `🕐 Heure: ${appointmentTime}\n\n` +
      `Merci de confirmer votre présence.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  async sendDocumentReadyNotification(clientPhone: string, clientName: string, documentName: string): Promise<WhatsAppResponse> {
    const message = `📄 *Document prêt*\n\n` +
      `Bonjour ${clientName},\n\n` +
      `Votre document "${documentName}" est prêt pour récupération.\n\n` +
      `Vous pouvez passer au cabinet ou nous contacter pour les modalités.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  async sendPaymentReminder(clientPhone: string, clientName: string, amount: number, invoiceNumber: string): Promise<WhatsAppResponse> {
    const message = `💰 *Rappel de paiement*\n\n` +
      `Bonjour ${clientName},\n\n` +
      `Nous vous rappelons que le paiement de la facture #${invoiceNumber} d'un montant de ${amount.toLocaleString()} FCFA est en attente.\n\n` +
      `Merci de régulariser votre situation.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  async sendCourtDateNotification(clientPhone: string, clientName: string, courtDate: string, courtTime: string, courtLocation: string): Promise<WhatsAppResponse> {
    const message = `⚖️ *Convocation au tribunal*\n\n` +
      `Bonjour ${clientName},\n\n` +
      `Vous êtes convoqué(e) au tribunal:\n` +
      `📅 Date: ${courtDate}\n` +
      `🕐 Heure: ${courtTime}\n` +
      `📍 Lieu: ${courtLocation}\n\n` +
      `Votre présence est obligatoire. Contactez-nous pour plus de détails.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  async sendWelcomeMessage(clientPhone: string, clientName: string, firmName: string): Promise<WhatsAppResponse> {
    const message = `🤝 *Bienvenue chez ${firmName}*\n\n` +
      `Bonjour ${clientName},\n\n` +
      `Nous vous souhaitons la bienvenue parmi nos clients. Nous sommes à votre disposition pour tous vos besoins juridiques.\n\n` +
      `N'hésitez pas à nous contacter pour toute question.`;

    return this.sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }

  // Test the WhatsApp service
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return { success: false, message: 'WhatsApp service is disabled' };
    }

    if (!this.apiKey || !this.instanceId) {
      return { success: false, message: 'WhatsApp API credentials not configured' };
    }

    try {
      // Try to send a test message to a test number (you can change this)
      const testResult = await this.sendMessage({
        to: '+221700000000', // Test number
        message: 'Test de connexion WhatsApp API',
        type: 'text',
      });

      return {
        success: testResult.success,
        message: testResult.success ? 'WhatsApp API connection successful' : testResult.error || 'Connection failed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
      };
    }
  }

  // Check if WhatsApp service is properly configured
  isConfigured(): boolean {
    return this.enabled && !!this.apiKey && !!this.instanceId;
  }

  // Get service status
  getStatus() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
      hasInstanceId: !!this.instanceId,
    };
  }
}

export default WhatsAppService;
