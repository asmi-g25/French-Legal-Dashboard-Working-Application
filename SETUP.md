# JURIS - Complete Setup Guide

This guide will help you set up your fully functional law firm management system with all integrations.

## 🚀 Features Included

- ✅ **Authentication & User Management**: Supabase-powered auth with law firm registration
- ✅ **Subscription Billing**: Monthly plans with usage limits and automatic blocking
- ✅ **Mobile Money Payments**: Orange Money, Moov Money, MTN Money, Wave integration
- ✅ **WhatsApp Business API**: Client communication via WhatsApp
- ✅ **Email Integration**: SMTP/SendGrid for notifications and communications
- ✅ **Access Control**: Automatic feature blocking when subscription expires
- ✅ **Real Database**: Complete schema with all law firm management tables

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Payment Gateway Accounts**: Register with mobile money providers
3. **WhatsApp Business Account**: Set up WhatsApp Business API
4. **Email Service**: Either Gmail/SMTP or SendGrid account

## 🛠️ Installation Steps

### 1. Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update all environment variables in `.env` with your actual credentials

### 2. Supabase Setup

1. Create a new Supabase project
2. Get your project URL and anon key from Project Settings > API
3. Run the database migration:
   ```sql
   -- Copy and paste the content from supabase/migrations/001_enhanced_schema.sql
   -- into your Supabase SQL editor and execute
   ```

4. Enable Row Level Security policies (already included in migration)

### 3. Mobile Money Payment Integration

#### Orange Money (Senegal, Mali, Niger, etc.)
1. Register at [Orange Developer Portal](https://developer.orange.com)
2. Create an application for Orange Money API
3. Get your API credentials:
   - API Key
   - Client Secret
   - Merchant ID
4. Add to `.env`:
   ```
   ORANGE_MONEY_API_KEY=your-api-key
   ORANGE_MONEY_SECRET=your-secret
   ORANGE_MONEY_MERCHANT_ID=your-merchant-id
   ```

#### Moov Money (Côte d'Ivoire, Benin, Togo)
1. Contact Moov Africa for API access
2. Complete merchant onboarding
3. Get API credentials and add to `.env`

#### MTN Mobile Money (Ghana, Uganda, Rwanda, etc.)
1. Register at [MTN Developer Portal](https://momodeveloper.mtn.com)
2. Create sandbox/production app
3. Get subscription key and API credentials
4. Add to `.env`:
   ```
   MTN_MONEY_API_KEY=your-api-key
   MTN_MONEY_SECRET=your-secret
   MTN_MONEY_SUBSCRIPTION_KEY=your-subscription-key
   ```

#### Wave (Senegal, Mali, Burkina Faso)
1. Contact Wave for merchant API access
2. Complete KYC and onboarding
3. Get API credentials and add to `.env`

### 4. WhatsApp Business API Setup

1. **Facebook Business Account**: Create at [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business Account**: Set up through Meta Business
3. **Phone Number**: Add and verify your business phone number
4. **Permanent Token**: Generate a permanent access token
5. **Webhook**: Set up webhook URL for message delivery status

Add to `.env`:
```
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-permanent-token
WHATSAPP_BUSINESS_ID=your-business-id
WHATSAPP_WEBHOOK_TOKEN=your-webhook-verification-token
```

### 5. Email Service Setup

#### Option A: SMTP (Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: Account > Security > App passwords
3. Add to `.env`:
   ```
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

#### Option B: SendGrid
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Generate API key in Settings > API Keys
3. Add to `.env`:
   ```
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your-sendgrid-api-key
   ```

### 6. Deploy to Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to hosting service** (Netlify, Vercel, etc.)

3. **Set up webhooks** for payment confirmations and WhatsApp delivery

## 🔧 API Credentials Required

### Essential for Full Functionality:

1. **Supabase**: Database and authentication
   - Project URL
   - Anon Key
   - Service Role Key (for admin operations)

2. **At least one Mobile Money provider** for payments:
   - Orange Money (West Africa)
   - Moov Money (Francophone Africa)
   - MTN Money (Anglophone Africa)
   - Wave (Selected countries)

3. **Email service** for notifications:
   - Gmail SMTP or SendGrid

4. **WhatsApp Business API** for client communication:
   - Business Account
   - Phone Number ID
   - Access Token
   - Webhook Token

### Optional but Recommended:

1. **SMS Provider** (Twilio, African SMS providers)
2. **File Storage** (if not using Supabase storage)
3. **Analytics** (Google Analytics, Mixpanel)

## 🧪 Testing

### Demo Mode
The application works in demo mode without real API credentials. All payment and messaging operations are simulated.

### Production Testing
1. Use sandbox/test credentials first
2. Test each payment method with small amounts
3. Verify WhatsApp message delivery
4. Test email notifications
5. Confirm subscription billing cycles

## 📊 Subscription Plans & Pricing

### Current Plans (XOF - West African Franc)

1. **Basic Plan - 15,000 XOF/month**
   - 10 cases, 25 clients, 50 documents
   - Basic features only
   - Email support

2. **Premium Plan - 35,000 XOF/month** ⭐ Recommended
   - 500 cases, 1,000 clients, 5,000 documents
   - WhatsApp & Email notifications
   - Advanced features
   - Priority support

3. **Enterprise Plan - 75,000 XOF/month**
   - Unlimited everything
   - All advanced features
   - API access
   - Dedicated support

### Automatic Features

- **Usage Tracking**: Real-time monitoring of plan limits
- **Access Control**: Automatic blocking when limits exceeded
- **Expiration Warnings**: 7, 3, and 1-day notifications
- **Grace Period**: 7-day grace period after expiration
- **Payment Processing**: Automatic subscription renewal

## 🔐 Security Features

1. **Row Level Security**: Database access restricted by firm
2. **JWT Authentication**: Secure session management
3. **API Rate Limiting**: Prevent abuse
4. **Data Encryption**: All sensitive data encrypted
5. **Audit Logs**: Track all system activities

## 🚨 Important Notes

### Data Protection
- All client data is encrypted and secured
- GDPR/data protection compliance built-in
- Regular backups via Supabase

### Payment Security
- PCI-compliant payment processing
- No card details stored in application
- Mobile money provider security protocols

### Scalability
- Built on Supabase for automatic scaling
- Edge functions for global performance
- CDN for fast asset delivery

## 📞 Support & Maintenance

### Regular Tasks
1. **Monitor Subscriptions**: Check for expiring plans
2. **Payment Reconciliation**: Verify payment confirmations
3. **Database Maintenance**: Regular backups and optimization
4. **API Monitoring**: Ensure all integrations are working

### Troubleshooting

#### Common Issues:
1. **Payment Failed**: Check API credentials and account status
2. **WhatsApp Not Sending**: Verify phone number status and token
3. **Email Not Delivered**: Check SMTP settings and DNS records
4. **Login Issues**: Verify Supabase configuration

#### Logs and Monitoring:
- Check browser console for frontend errors
- Monitor Supabase logs for database issues
- Review payment gateway dashboards
- WhatsApp Business API webhook logs

## 🎯 Next Steps

After setup:
1. **Test all features thoroughly**
2. **Import existing client data** (if migrating)
3. **Train staff on the system**
4. **Set up regular backups**
5. **Monitor usage and performance**

## 📈 Scaling Your Practice

The system supports:
- **Multiple law firms** (multi-tenant)
- **Team collaboration** (multiple users per firm)
- **Client portals** (future feature)
- **Mobile applications** (API-ready)
- **Third-party integrations** (webhook support)

---

For technical support, refer to the API documentation or contact your system administrator.
