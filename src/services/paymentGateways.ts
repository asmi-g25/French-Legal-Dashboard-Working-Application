import { supabase } from '@/integrations/supabase/client';

export type PaymentMethod = 'orange_money' | 'moov_money' | 'mtn_money' | 'wave' | 'bank_transfer';

export interface PaymentConfig {
  method: PaymentMethod;
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  baseUrl: string;
  currency: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  description: string;
  reference: string;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  externalReference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  paymentUrl?: string;
}

export interface PaymentStatus {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  processedAt?: string;
  failureReason?: string;
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

// Payment gateway configurations for each provider
const PAYMENT_CONFIGS: Record<PaymentMethod, Partial<PaymentConfig>> = {
  orange_money: {
    baseUrl: 'https://api.orange-sonatel.com',
    currency: 'XOF',
    apiKey: getEnvVar('ORANGE_MONEY_API_KEY'),
    apiSecret: getEnvVar('ORANGE_MONEY_API_SECRET'),
    merchantId: getEnvVar('ORANGE_MONEY_MERCHANT_ID'),
  },
  moov_money: {
    baseUrl: 'https://api.moovio.com',
    apiKey: getEnvVar('MOOV_PUBLIC_KEY'),
    apiSecret: getEnvVar('MOOV_SECRET_KEY'),
    currency: 'USD', // Moov works with USD
  },
  mtn_money: {
    baseUrl: 'https://sandbox.momodeveloper.mtn.com',
    apiKey: getEnvVar('MTN_MONEY_PRIMARY_KEY'),
    apiSecret: getEnvVar('MTN_MONEY_SECONDARY_KEY'),
    currency: 'EUR', // MTN sandbox uses EUR
  },
  wave: {
    baseUrl: 'https://api.wave.com',
    currency: 'XOF',
    apiKey: getEnvVar('WAVE_API_KEY'),
    apiSecret: getEnvVar('WAVE_API_SECRET'),
    merchantId: getEnvVar('WAVE_MERCHANT_ID'),
  },
  bank_transfer: {
    baseUrl: '',
    currency: 'XOF',
  },
};

class PaymentGateway {
  private config: PaymentConfig;

  constructor(method: PaymentMethod, credentials: Partial<PaymentConfig>) {
    const baseConfig = PAYMENT_CONFIGS[method];
    this.config = {
      method,
      ...baseConfig,
      ...credentials,
    } as PaymentConfig;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Log payment request in database
      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .insert({
          firm_id: (await supabase.auth.getUser()).data.user?.id || '',
          transaction_id: request.reference,
          payment_method: this.config.method,
          amount: request.amount,
          currency: request.currency,
          phone_number: request.phoneNumber,
          description: request.description,
          status: 'pending',
          callback_url: request.callbackUrl,
          return_url: request.returnUrl,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Simulate payment initiation based on provider
      switch (this.config.method) {
        case 'orange_money':
          return await this.initiateOrangeMoneyPayment(request);
        case 'moov_money':
          return await this.initiateMoovMoneyPayment(request);
        case 'mtn_money':
          return await this.initiateMtnMoneyPayment(request);
        case 'wave':
          return await this.initiateWavePayment(request);
        default:
          throw new Error(`Unsupported payment method: ${this.config.method}`);
      }
    } catch (error: any) {
      return {
        success: false,
        transactionId: request.reference,
        status: 'failed',
        message: error.message || 'Payment initiation failed',
      };
    }
  }

  private async initiateOrangeMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Orange Money API integration
    const payload = {
      merchant_key: this.config.merchantId,
      currency: request.currency,
      order_id: request.reference,
      amount: request.amount,
      return_url: request.returnUrl,
      cancel_url: request.callbackUrl,
      notif_url: request.callbackUrl,
      lang: 'fr',
      reference: request.reference,
    };

    // Check if credentials are configured
    if (!this.config.apiKey || !this.config.merchantId) {
      throw new Error('Orange Money credentials not configured. Please set VITE_ORANGE_MONEY_API_KEY and VITE_ORANGE_MONEY_MERCHANT_ID environment variables.');
    }
    const response = await fetch(`${this.config.baseUrl}/webpayment/v1/webpayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      transactionId: request.reference,
      externalReference: data.payment_token,
      status: 'pending',
      message: data.message || 'Payment initiated',
      paymentUrl: data.payment_url,
    };
  }

  private async initiateMoovMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Moov Money API integration according to their guide
    const moovAccountId = 'ea9f2225-403b-4e2c-93b0-0eda090ffa65'; // This should be your actual account ID
    
    const payload = {
      source: {
        paymentMethodID: 'moov-wallet', // This should be a valid payment method ID
      },
      destination: {
        paymentMethodID: request.phoneNumber, // Phone as destination
      },
      amount: {
        currency: 'USD', // Moov uses USD
        value: Math.round(request.amount * 100), // Convert to cents
      },
      description: request.description,
      metadata: {
        reference: request.reference,
        phoneNumber: request.phoneNumber,
      },
    };

    // Use real API if enabled and credentials available
    if (getEnvVar('ENABLE_REAL_PAYMENTS') === 'true' && this.config.apiKey) {
      try {
        console.log('Moov Money API Request:', {
          url: `${this.config.baseUrl}/accounts/${moovAccountId}/transfers`,
          payload,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'x-moov-version': 'v2024.01.00',
            'x-idempotency-key': request.reference,
          }
        });

        const response = await fetch(`${this.config.baseUrl}/accounts/${moovAccountId}/transfers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'x-moov-version': 'v2024.01.00',
            'x-idempotency-key': request.reference,
          },
          body: JSON.stringify(payload),
        });

        console.log('Moov Money API Response Status:', response.status);

        let data;
        try {
          data = await response.json();
          console.log('Moov Money API Response Data:', data);
        } catch (jsonError) {
          const text = await response.text();
          console.error('Moov Money Response Text:', text);
          throw new Error(`Moov API Error: ${response.status} - ${text}`);
        }

        if (response.ok) {
          return {
            success: true,
            transactionId: request.reference,
            externalReference: data.transferID,
            status: 'pending',
            message: 'Paiement Moov Money initié avec succès.',
          };
        } else {
          throw new Error(data.message || `Moov API Error: ${response.status} - ${JSON.stringify(data)}`);
        }
      } catch (error: any) {
        console.error('Moov Money payment error:', error);
        throw error; // Don't fall back to demo mode, show the actual error
      }
    }

    // Demo mode response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      transactionId: request.reference,
      externalReference: `MOOV_${Date.now()}`,
      status: 'pending',
      message: 'Paiement Moov Money initié (mode démo).',
    };
  }

  private async initiateMtnMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // MTN Mobile Money API integration according to their guide
    const payload = {
      externalTransactionId: request.reference,
      money: {
        amount: request.amount.toString(),
        currency: 'EUR', // MTN sandbox uses EUR
      },
      customerReference: request.phoneNumber.replace('+', ''),
      serviceProviderUserName: 'JURIS Law Firm',
      receiverMessage: request.description,
      senderNote: `Payment for ${request.description}`,
    };

    // Use real API if enabled and credentials available
    if (getEnvVar('ENABLE_REAL_PAYMENTS') === 'true' && this.config.apiKey) {
      try {
        // First get access token
        console.log('Getting MTN access token...');
        const accessToken = await this.getMtnAccessToken();
        console.log('MTN access token obtained:', accessToken ? 'Yes' : 'No');

        console.log('MTN Money API Request:', {
          url: `${this.config.baseUrl}/collection/v2_0/payment`,
          payload,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Reference-Id': request.reference,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.config.apiKey,
            'X-Callback-Url': request.callbackUrl || '',
          }
        });

        const response = await fetch(`${this.config.baseUrl}/collection/v2_0/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Reference-Id': request.reference,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.config.apiKey,
            'X-Callback-Url': request.callbackUrl || '',
          },
          body: JSON.stringify(payload),
        });

        console.log('MTN Money API Response Status:', response.status);

        if (response.status === 202) {
          // 202 Accepted means payment was initiated successfully
          return {
            success: true,
            transactionId: request.reference,
            status: 'pending',
            message: 'Paiement MTN Money initié avec succès.',
          };
        } else {
          let errorData;
          try {
            errorData = await response.json();
            console.log('MTN Error Response:', errorData);
          } catch (jsonError) {
            const text = await response.text();
            console.error('MTN Response Text:', text);
            throw new Error(`MTN API Error: ${response.status} - ${text}`);
          }
          throw new Error(errorData.message || `MTN API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
      } catch (error: any) {
        console.error('MTN Money payment error:', error);
        throw error; // Don't fall back to demo mode, show the actual error
      }
    }

    // Demo mode response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      transactionId: request.reference,
      externalReference: `MTN_${Date.now()}`,
      status: 'pending',
      message: 'Paiement MTN Money initié (mode démo).',
    };
  }

  private async getMtnAccessToken(): Promise<string> {
    // MTN Mobile Money requires OAuth token
    try {
      console.log('MTN Token Request:', {
        url: `${this.config.baseUrl}/collection/token/`,
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
          'Authorization': `Basic ${btoa(`${this.config.apiKey}:${this.config.apiSecret}`)}`,
        }
      });

      const response = await fetch(`${this.config.baseUrl}/collection/token/`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
          'Authorization': `Basic ${btoa(`${this.config.apiKey}:${this.config.apiSecret}`)}`,
        },
      });

      console.log('MTN Token Response Status:', response.status);

      let data;
      try {
        data = await response.json();
        console.log('MTN Token Response:', data);
      } catch (jsonError) {
        const text = await response.text();
        console.error('MTN Token Response Text:', text);
        throw new Error(`MTN Token API Error: ${response.status} - ${text}`);
      }

      if (!response.ok) {
        throw new Error(`MTN Token Error: ${response.status} - ${JSON.stringify(data)}`);
      }

      return data.access_token || '';
    } catch (error) {
      console.error('Error getting MTN access token:', error);
      throw error;
    }
  }

  private async initiateWavePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Wave API integration
    const payload = {
      amount: request.amount,
      currency: request.currency,
      checkout_intent: request.reference,
      error_url: request.callbackUrl,
      success_url: request.returnUrl,
      mobile: request.phoneNumber,
    };

    // For demo purposes, simulate API response
    if (getEnvVar('NODE_ENV', 'development') === 'development') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        transactionId: request.reference,
        externalReference: `WAVE_${Date.now()}`,
        status: 'pending',
        message: 'Paiement Wave initié. Ouvrez votre app Wave.',
        paymentUrl: `https://checkout.wave.com/${request.reference}`,
      };
    }

    const response = await fetch(`${this.config.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return {
      success: response.ok,
      transactionId: request.reference,
      externalReference: data.id,
      status: 'pending',
      message: 'Payment session created',
      paymentUrl: data.checkout_url,
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      // Get transaction from database
      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction not found');
      }

      // For demo purposes, simulate status updates
      if (getEnvVar('NODE_ENV', 'development') === 'development') {
        // Randomly simulate payment completion after some time
        const now = new Date();
        const createdAt = new Date(transaction.created_at);
        const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        if (minutesElapsed > 2 && Math.random() > 0.3) {
          // Update status to completed
          await supabase
            .from('payment_transactions')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('transaction_id', transactionId);

          return {
            transactionId,
            status: 'completed',
            amount: transaction.amount,
            currency: transaction.currency,
            phoneNumber: transaction.phone_number,
            reference: transaction.external_reference || transactionId,
            processedAt: new Date().toISOString(),
          };
        }
      }

      // Real API status check would go here based on payment method
      return {
        transactionId,
        status: transaction.status as any,
        amount: transaction.amount,
        currency: transaction.currency,
        phoneNumber: transaction.phone_number,
        reference: transaction.external_reference || transactionId,
        processedAt: transaction.processed_at,
      };

    } catch (error: any) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async handleCallback(callbackData: any): Promise<boolean> {
    try {
      const { transactionId, status, externalReference } = callbackData;

      // Update transaction status in database
      const { error } = await supabase
        .from('payment_transactions')
        .update({
          status,
          external_reference: externalReference,
          processed_at: status === 'completed' ? new Date().toISOString() : null,
          metadata: callbackData,
        })
        .eq('transaction_id', transactionId);

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      // If payment is completed, update subscription if applicable
      if (status === 'completed') {
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('transaction_id', transactionId)
          .single();

        if (transaction?.subscription_id) {
          await this.activateSubscription(transaction.firm_id, transaction.subscription_id);
        }
      }

      return true;
    } catch (error) {
      console.error('Callback handling failed:', error);
      return false;
    }
  }

  private async activateSubscription(firmId: string, subscriptionId: string) {
    const planPrices = {
      basic: Number(getEnvVar('BASIC_PLAN_PRICE', '15000')),
      premium: Number(getEnvVar('PREMIUM_PLAN_PRICE', '35000')),
      enterprise: Number(getEnvVar('ENTERPRISE_PLAN_PRICE', '75000')),
    };

    const plan = subscriptionId as keyof typeof planPrices;
    const amount = planPrices[plan] || 0;

    // Update profile subscription
    await supabase
      .from('profiles')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', firmId);

    // Create subscription payment record
    await supabase
      .from('subscription_payments')
      .insert({
        firm_id: firmId,
        plan_name: plan,
        amount,
        currency: 'XOF',
        billing_period: 'monthly',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
  }
}

// Export the main payment service
export class PaymentService {
  static async initiatePayment(
    method: PaymentMethod,
    request: PaymentRequest,
    credentials?: Partial<PaymentConfig>
  ): Promise<PaymentResponse> {
    const gateway = new PaymentGateway(method, credentials || {});
    return await gateway.initiatePayment(request);
  }

  static async checkStatus(
    method: PaymentMethod,
    transactionId: string,
    credentials?: Partial<PaymentConfig>
  ): Promise<PaymentStatus> {
    const gateway = new PaymentGateway(method, credentials || {});
    return await gateway.checkPaymentStatus(transactionId);
  }

  static async handleCallback(
    method: PaymentMethod,
    callbackData: any,
    credentials?: Partial<PaymentConfig>
  ): Promise<boolean> {
    const gateway = new PaymentGateway(method, credentials || {});
    return await gateway.handleCallback(callbackData);
  }

  static getAvailablePaymentMethods(): Array<{
    method: PaymentMethod;
    name: string;
    description: string;
    countries: string[];
    currency: string;
  }> {
    return [
      {
        method: 'orange_money',
        name: 'Orange Money',
        description: 'Paiement mobile Orange Money',
        countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Niger', 'Guinée'],
        currency: 'XOF',
      },
      {
        method: 'moov_money',
        name: 'Moov Money',
        description: 'Paiement mobile Moov Money',
        countries: ['Côte d\'Ivoire', 'Bénin', 'Togo'],
        currency: 'USD',
      },
      {
        method: 'mtn_money',
        name: 'MTN Mobile Money',
        description: 'Paiement mobile MTN Money',
        countries: ['Ghana', 'Uganda', 'Rwanda', 'Zambia'],
        currency: 'EUR',
      },
      {
        method: 'wave',
        name: 'Wave',
        description: 'Paiement mobile Wave',
        countries: ['Sénégal', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso'],
        currency: 'XOF',
      },
    ];
  }
}

export default PaymentService;
