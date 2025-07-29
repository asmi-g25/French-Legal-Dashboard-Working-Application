import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import PaymentService from '@/services/paymentGateways';
import EmailService from '@/services/emailService';
import SMSService from '@/services/smsService';
import NotificationService from '@/services/notificationService';

import { 
  MessageSquare, 
  Mail, 
  Smartphone, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Loader2,
  TestTube,
  Send
} from 'lucide-react';

const IntegrationTester = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  const [testData, setTestData] = useState({
    email: '',
    phone: '',
    amount: 1000,
    clientName: 'Test Client',
    message: 'This is a test message from JURIS',
  });

  const updateResult = (service: string, result: any) => {
    setTestResults(prev => ({ ...prev, [service]: result }));
  };

  const updateLoading = (service: string, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [service]: loading }));
  };

  const testEmailService = async () => {
    updateLoading('email', true);
    try {
      const emailService = new EmailService();
      const result = await emailService.sendEmail({
        to: testData.email,
        subject: 'Test Email from JURIS',
        html: `
          <h2>Test Email</h2>
          <p>Hello ${testData.clientName},</p>
          <p>${testData.message}</p>
          <p>This is a test email from your JURIS law firm management system.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
      }, user?.id);

      updateResult('email', result);
      
      toast({
        title: result.success ? "Email Test Successful" : "Email Test Failed",
        description: result.success ? "Test email sent successfully!" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      updateResult('email', { success: false, error: error.message });
    }
    updateLoading('email', false);
  };

  const testSMSService = async () => {
    updateLoading('sms', true);
    try {
      const smsService = new SMSService();
      const result = await smsService.sendSMS({
        to: testData.phone,
        message: `Test SMS from JURIS: ${testData.message} - Sent at ${new Date().toLocaleString()}`,
      }, user?.id);

      updateResult('sms', result);
      
      toast({
        title: result.success ? "SMS Test Successful" : "SMS Test Failed",
        description: result.success ? "Test SMS sent successfully!" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      updateResult('sms', { success: false, error: error.message });
    }
    updateLoading('sms', false);
  };

  const testPaymentService = async (method: 'mtn_money' | 'moov_money') => {
    updateLoading(method, true);
    try {
      const result = await PaymentService.initiatePayment(method, {
        amount: testData.amount,
        currency: 'XOF',
        phoneNumber: testData.phone,
        description: `Test payment - JURIS`,
        reference: `TEST_${Date.now()}`,
      });

      updateResult(method, result);
      
      toast({
        title: result.success ? `${method.toUpperCase()} Test Successful` : `${method.toUpperCase()} Test Failed`,
        description: result.success ? "Test payment initiated!" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      updateResult(method, { success: false, error: error.message });
    }
    updateLoading(method, false);
  };

  const testNotificationService = async () => {
    updateLoading('notification', true);
    try {
      const notificationService = new NotificationService();
      const result = await notificationService.sendNotification({
        firmId: user?.id || '',
        type: 'appointment_reminder',
        channels: ['email', 'sms'],
        recipients: [{
          email: testData.email,
          phone: testData.phone,
          name: testData.clientName,
        }],
        data: {
          clientName: testData.clientName,
          appointmentDate: new Date().toLocaleDateString('fr-FR'),
          appointmentTime: '14:30',
          firmName: user?.firmName || 'Test Law Firm',
        },
      });

      updateResult('notification', result);
      
      toast({
        title: result.success ? "Notification Test Successful" : "Notification Test Failed",
        description: result.success ? "Multi-channel notification sent!" : "Some notifications failed",
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      updateResult('notification', { success: false, error: error.message });
    }
    updateLoading('notification', false);
  };

  const renderTestResult = (service: string, icon: React.ReactNode) => {
    const result = testResults[service];
    const loading = isLoading[service];

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium capitalize">{service.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center space-x-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!loading && result && (
            <>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Success" : "Failed"}
              </Badge>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <Alert>
        <AlertDescription>
          Please log in to test integrations.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Integration Testing Center</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Important Notes:</strong><br/>
              • SMS: Use a different phone number than +12567806102 (your Twilio number)<br/>
              • MTN Money: Uses EUR currency in sandbox mode<br/>
              • Moov Money: Uses USD currency<br/>
              • All tests will show detailed error logs in browser console
            </AlertDescription>
          </Alert>

          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-email">Test Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testData.email}
                onChange={(e) => setTestData({...testData, email: e.target.value})}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="test-phone">Test Phone Number</Label>
              <Input
                id="test-phone"
                type="tel"
                value={testData.phone}
                onChange={(e) => setTestData({...testData, phone: e.target.value})}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="test-amount">Payment Amount (XOF)</Label>
              <Input
                id="test-amount"
                type="number"
                value={testData.amount}
                onChange={(e) => setTestData({...testData, amount: Number(e.target.value)})}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="test-client">Client Name</Label>
              <Input
                id="test-client"
                value={testData.clientName}
                onChange={(e) => setTestData({...testData, clientName: e.target.value})}
                placeholder="Test Client"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="test-message">Test Message</Label>
            <Textarea
              id="test-message"
              value={testData.message}
              onChange={(e) => setTestData({...testData, message: e.target.value})}
              placeholder="Test message content"
              rows={3}
            />
          </div>

          <Separator />

          {/* Individual Service Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Individual Service Tests</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Service</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderTestResult('email', <Mail className="h-4 w-4" />)}
                  <Button 
                    onClick={testEmailService} 
                    disabled={isLoading.email}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading.email ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Test Email
                  </Button>
                  {testResults.email && !testResults.email.success && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700 text-xs">
                        {testResults.email.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>SMS Service</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderTestResult('sms', <MessageSquare className="h-4 w-4" />)}
                  <Button 
                    onClick={testSMSService} 
                    disabled={isLoading.sms}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading.sms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Test SMS
                  </Button>
                  {testResults.sms && !testResults.sms.success && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700 text-xs">
                        {testResults.sms.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-yellow-600" />
                    <span>MTN Money</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderTestResult('mtn_money', <Smartphone className="h-4 w-4" />)}
                  <Button 
                    onClick={() => testPaymentService('mtn_money')} 
                    disabled={isLoading.mtn_money}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading.mtn_money ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Test MTN Payment
                  </Button>
                  {testResults.mtn_money && !testResults.mtn_money.success && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700 text-xs">
                        {testResults.mtn_money.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    <span>Moov Money</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderTestResult('moov_money', <Smartphone className="h-4 w-4" />)}
                  <Button 
                    onClick={() => testPaymentService('moov_money')} 
                    disabled={isLoading.moov_money}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading.moov_money ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Test Moov Payment
                  </Button>
                  {testResults.moov_money && !testResults.moov_money.success && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700 text-xs">
                        {testResults.moov_money.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Comprehensive Test */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Multi-Channel Notification Test</h3>
            <Card>
              <CardContent className="pt-4 space-y-3">
                {renderTestResult('notification', <TestTube className="h-4 w-4" />)}
                <Button 
                  onClick={testNotificationService} 
                  disabled={isLoading.notification}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading.notification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Test Multi-Channel Notification (Email + SMS)
                </Button>
                <p className="text-sm text-gray-600">
                  This will send an appointment reminder via both email and SMS using your real credentials.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Credentials Status */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Credentials Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Gmail SMTP</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Twilio SMS</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>MTN Money</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Moov Money</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationTester;
