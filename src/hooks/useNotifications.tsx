
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationData {
  type: 'email' | 'whatsapp';
  recipient: string;
  subject?: string;
  message: string;
}

export const useNotifications = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendNotification = async (notificationData: NotificationData): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log(`Sending ${notificationData.type} notification:`, notificationData);
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success (95% success rate)
      const success = Math.random() > 0.05;

      if (success) {
        toast({
          title: `Notification ${notificationData.type === 'email' ? 'Email' : 'WhatsApp'} envoyée`,
          description: `Message envoyé à ${notificationData.recipient}`,
        });
        
        // Log the simulated notification
        console.log(`✅ ${notificationData.type.toUpperCase()} sent to ${notificationData.recipient}`);
        console.log(`📧 Subject: ${notificationData.subject || 'N/A'}`);
        console.log(`💬 Message: ${notificationData.message}`);
        
        return true;
      } else {
        throw new Error('Échec de l\'envoi de la notification');
      }
    } catch (error) {
      toast({
        title: "Erreur d'envoi",
        description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendBulkNotifications = async (notifications: NotificationData[]): Promise<void> => {
    for (const notification of notifications) {
      await sendNotification(notification);
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return { sendNotification, sendBulkNotifications, loading };
};
