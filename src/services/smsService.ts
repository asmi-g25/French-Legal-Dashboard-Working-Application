import { supabase } from '@/integrations/supabase/client';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SMSMessage {
  to: string;
  message: string;
  from?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// Get environment variables safely
const getEnvVar = (key: string, defaultValue: string = '') => {
  if (typeof window !== 'undefined') {
    // Browser environment - use import.meta.env
    return (import.meta.env as any)[`VITE_${key}`] || defaultValue;
  }
  // Server environment - use process.env
  return (typeof process !== 'undefined' ? process.env[key] : null) || defaultValue;
};

class SMSService {
  private config: TwilioConfig;

  constructor(config?: Partial<TwilioConfig>) {
    this.config = {
      accountSid: getEnvVar('TWILIO_ACCOUNT_SID'),
      authToken: getEnvVar('TWILIO_AUTH_TOKEN'),
      phoneNumber: getEnvVar('TWILIO_PHONE_NUMBER'),
      ...config,
    };
  }

  async sendSMS(message: SMSMessage, firmId?: string): Promise<SMSResponse> {
    try {
      // Log the communication attempt
      if (firmId) {
        await this.logCommunication({
          firm_id: firmId,
          type: 'sms',
          direction: 'outbound',
          to_address: message.to,
          subject: 'SMS Message',
          content: message.message,
          status: 'pending',
        });
      }

      // Check if required credentials are available
      if (!this.config.accountSid || !this.config.authToken || !this.config.phoneNumber) {
        throw new Error('SMS credentials not configured. Please set VITE_TWILIO_ACCOUNT_SID, VITE_TWILIO_AUTH_TOKEN, and VITE_TWILIO_PHONE_NUMBER environment variables.');
      }

      // Real Twilio API call
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      // Ensure we don't send from the same number to itself
      const fromNumber = message.from || this.config.phoneNumber;
      if (fromNumber === message.to) {
        throw new Error('Cannot send SMS to the same number as sender. Please use a different phone number for testing.');
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `From=${encodeURIComponent(fromNumber)}&To=${encodeURIComponent(message.to)}&Body=${encodeURIComponent(message.message)}`,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text response
        const text = await response.text();
        throw new Error(`SMS API Error: ${response.status} - ${text}`);
      }

      if (response.ok && data.sid) {
        if (firmId) {
          await this.updateCommunicationStatus(message.to, data.sid, 'sent');
        }

        return {
          success: true,
          messageId: data.sid,
          details: data,
        };
      } else {
        throw new Error(data.message || `SMS API Error: ${response.status}`);
      }
    } catch (error: any) {
      if (firmId) {
        await this.updateCommunicationStatus(message.to, '', 'failed', error.message);
      }

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error,
      };
    }
  }

  async sendAppointmentReminder(
    to: string,
    clientName: string,
    appointmentDate: string,
    appointmentTime: string,
    firmName: string,
    firmId?: string
  ): Promise<SMSResponse> {
    const message = `Bonjour ${clientName}, rappel de votre RDV le ${appointmentDate} à ${appointmentTime}. Confirmez SVP. - ${firmName}`;
    
    return this.sendSMS({
      to,
      message,
    }, firmId);
  }

  async sendCaseUpdate(
    to: string,
    clientName: string,
    caseTitle: string,
    update: string,
    firmName: string,
    firmId?: string
  ): Promise<SMSResponse> {
    const message = `Bonjour ${clientName}, mise à jour "${caseTitle}": ${update.substring(0, 100)}... - ${firmName}`;
    
    return this.sendSMS({
      to,
      message,
    }, firmId);
  }

  async sendPaymentReminder(
    to: string,
    clientName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string,
    firmName: string,
    firmId?: string
  ): Promise<SMSResponse> {
    const message = `Bonjour ${clientName}, rappel paiement facture ${invoiceNumber} (${amount}) échéance ${dueDate}. - ${firmName}`;
    
    return this.sendSMS({
      to,
      message,
    }, firmId);
  }

  async sendPaymentConfirmation(
    to: string,
    clientName: string,
    amount: string,
    invoiceNumber: string,
    firmName: string,
    firmId?: string
  ): Promise<SMSResponse> {
    const message = `Bonjour ${clientName}, paiement de ${amount} pour la facture ${invoiceNumber} bien reçu. Merci! - ${firmName}`;
    
    return this.sendSMS({
      to,
      message,
    }, firmId);
  }

  private async logCommunication(communication: any): Promise<void> {
    try {
      await supabase
        .from('communications')
        .insert({
          ...communication,
          sent_at: communication.direction === 'outbound' ? new Date().toISOString() : null,
        });
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  }

  private async updateCommunicationStatus(to: string, messageId: string, status: string, errorMessage?: string): Promise<void> {
    try {
      await supabase
        .from('communications')
        .update({
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          metadata: messageId ? { message_id: messageId } : { error: errorMessage },
        })
        .eq('to_address', to)
        .eq('type', 'sms')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Error updating communication status:', error);
    }
  }
}

export default SMSService;
