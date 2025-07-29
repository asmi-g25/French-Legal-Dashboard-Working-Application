import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import EmailService from '@/services/emailService';
import SMSService from '@/services/smsService';
import { Search, Plus, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';

interface Communication {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'phone';
  direction: 'inbound' | 'outbound';
  to_address: string;
  from_address: string | null;
  cc_addresses: string[] | null;
  bcc_addresses: string[] | null;
  subject: string | null;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at: string | null;
  read_at: string | null;
  metadata: any;
  client_id: string | null;
  case_id: string | null;
  client_name?: string;
  case_title?: string;
  created_at: string;
}

interface CommunicationStats {
  totalEmails: number;
  totalSMS: number;
  totalWhatsApp: number;
  thisWeek: number;
}

const Communications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [stats, setStats] = useState<CommunicationStats>({
    totalEmails: 0,
    totalSMS: 0,
    totalWhatsApp: 0,
    thisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewCommModalOpen, setIsNewCommModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [clients, setClients] = useState<Array<{id: string, name: string, email: string | null, phone: string | null}>>([]);
  const [cases, setCases] = useState<Array<{id: string, title: string}>>([]);
  const [newCommForm, setNewCommForm] = useState({
    type: 'email' as 'email' | 'sms' | 'whatsapp',
    to_address: '',
    subject: '',
    content: '',
    client_id: '',
    case_id: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadCommunications();
      loadClients();
      loadCases();
      loadStats();
    }
  }, [user]);

  const loadCommunications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First try a simple query to check if the table exists
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if it's a table not found error
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('La table communications n\'existe pas encore. Veuillez configurer la base de données.');
        }
        if (error.message.includes('relationship') || error.message.includes('schema cache')) {
          throw new Error('Les tables de la base de données ne sont pas correctement configurées. Veuillez exécuter les migrations SQL.');
        }
        throw error;
      }

      // If we have data, try to get the related information
      if (data && data.length > 0) {
        try {
          const { data: enrichedData, error: enrichError } = await supabase
            .from('communications')
            .select(`
              *,
              clients(first_name, last_name, company_name),
              cases(title)
            `)
            .eq('firm_id', user.id)
            .order('created_at', { ascending: false });

          if (enrichError) {
            // Fallback to basic data if joins fail
            setCommunications(data.map(comm => ({ ...comm, client_name: null, case_title: null })));
          } else {
            const communicationsWithNames = enrichedData?.map(comm => ({
              ...comm,
              client_name: comm.clients ?
                (comm.clients.company_name || `${comm.clients.first_name} ${comm.clients.last_name}`) :
                null,
              case_title: comm.cases?.title || null,
            })) || [];
            setCommunications(communicationsWithNames);
          }
        } catch (joinError) {
          // Fallback to basic data
          setCommunications(data.map(comm => ({ ...comm, client_name: null, case_title: null })));
        }
      } else {
        setCommunications([]);
      }
    } catch (error: any) {
      console.error('Error loading communications:', error);
      toast({
        title: "Erreur de Configuration",
        description: error.message.includes('table') || error.message.includes('relation') ?
          "La base de données n'est pas configurée. Allez dans l'onglet 'Configuration' pour configurer les tables." :
          `Impossible de charger les communications: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, company_name, email, phone')
        .eq('firm_id', user.id)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;

      const clientsWithNames = data?.map(client => ({
        id: client.id,
        name: client.company_name || `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone,
      })) || [];

      setClients(clientsWithNames);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCases = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, title')
        .eq('firm_id', user.id)
        .in('status', ['open', 'in_progress'])
        .order('title');

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      // Get total emails
      const { count: totalEmails } = await supabase
        .from('communications')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .eq('type', 'email');

      // Get total SMS  
      const { count: totalSMS } = await supabase
        .from('communications')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .eq('type', 'sms');

      // Get total WhatsApp
      const { count: totalWhatsApp } = await supabase
        .from('communications')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .eq('type', 'whatsapp');

      // Get this week's communications
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: thisWeek } = await supabase
        .from('communications')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      setStats({
        totalEmails: totalEmails || 0,
        totalSMS: totalSMS || 0,
        totalWhatsApp: totalWhatsApp || 0,
        thisWeek: thisWeek || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSendCommunication = async () => {
    if (!newCommForm.to_address || !newCommForm.content || !user?.id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      if (newCommForm.type === 'email') {
        const emailService = new EmailService();
        const result = await emailService.sendEmail({
          to: newCommForm.to_address,
          subject: newCommForm.subject || 'Message du cabinet',
          html: newCommForm.content.replace(/\n/g, '<br>'),
        }, user.id);

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
        }
      } else if (newCommForm.type === 'sms') {
        const smsService = new SMSService();
        const result = await smsService.sendSMS({
          to: newCommForm.to_address,
          message: newCommForm.content,
        }, user.id);

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'envoi du SMS');
        }
      }

      toast({
        title: "Succès",
        description: `${newCommForm.type === 'email' ? 'Email' : 'SMS'} envoyé avec succès`,
      });

      setIsNewCommModalOpen(false);
      setNewCommForm({
        type: 'email',
        to_address: '',
        subject: '',
        content: '',
        client_id: '',
        case_id: '',
      });
      loadCommunications();
      loadStats();
    } catch (error: any) {
      console.error('Error sending communication:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewCommForm({
        ...newCommForm,
        client_id: clientId,
        to_address: newCommForm.type === 'email' ? (client.email || '') : (client.phone || ''),
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'phone': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Envoyé';
      case 'delivered': return 'Livré';
      case 'read': return 'Lu';
      case 'failed': return 'Échec';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'whatsapp': return MessageSquare;
      case 'phone': return Phone;
      default: return Mail;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'whatsapp': return 'WhatsApp';
      case 'phone': return 'Téléphone';
      default: return type;
    }
  };

  const filteredCommunications = communications.filter(comm =>
    searchTerm === '' ||
    comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.to_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement des communications...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Communications
          </h1>
          <div className="flex items-center space-x-2">
            <Dialog open={isNewCommModalOpen} onOpenChange={setIsNewCommModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Communication
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nouvelle Communication</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Type de communication *</Label>
                    <Select 
                      value={newCommForm.type} 
                      onValueChange={(value: 'email' | 'sms' | 'whatsapp') => 
                        setNewCommForm({...newCommForm, type: value, to_address: ''})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="client_id">Client</Label>
                    <Select 
                      value={newCommForm.client_id} 
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {newCommForm.type === 'email' ? 
                              (client.email ? `(${client.email})` : '(pas d\'email)') : 
                              (client.phone ? `(${client.phone})` : '(pas de téléphone)')
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="to_address">
                      {newCommForm.type === 'email' ? 'Adresse email *' : 'Numéro de téléphone *'}
                    </Label>
                    <Input
                      id="to_address"
                      type={newCommForm.type === 'email' ? 'email' : 'tel'}
                      value={newCommForm.to_address}
                      onChange={(e) => setNewCommForm({...newCommForm, to_address: e.target.value})}
                      placeholder={newCommForm.type === 'email' ? 'client@example.com' : '+33 1 23 45 67 89'}
                    />
                  </div>

                  {newCommForm.type === 'email' && (
                    <div>
                      <Label htmlFor="subject">Sujet</Label>
                      <Input
                        id="subject"
                        value={newCommForm.subject}
                        onChange={(e) => setNewCommForm({...newCommForm, subject: e.target.value})}
                        placeholder="Sujet de l'email"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="case_id">Dossier associé</Label>
                    <Select 
                      value={newCommForm.case_id} 
                      onValueChange={(value) => setNewCommForm({...newCommForm, case_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Associer à un dossier (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((caseItem) => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="content">Message *</Label>
                    <Textarea
                      id="content"
                      value={newCommForm.content}
                      onChange={(e) => setNewCommForm({...newCommForm, content: e.target.value})}
                      placeholder="Contenu du message..."
                      rows={4}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={() => setIsNewCommModalOpen(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button onClick={handleSendCommunication} disabled={isSending} className="flex-1">
                      {isSending ? 'Envoi...' : 'Envoyer'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{stats.totalEmails}</p>
                  <p className="text-sm text-blue-600">Emails envoyés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{stats.totalSMS}</p>
                  <p className="text-sm text-green-600">Messages SMS</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{stats.totalWhatsApp}</p>
                  <p className="text-sm text-green-600">Messages WhatsApp</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <Send className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-800">{stats.thisWeek}</p>
                  <p className="text-sm text-orange-600">Cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communications List */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle>Historique des Communications</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher communications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-slate-300 focus:border-amber-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCommunications.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {communications.length === 0 ? 'Aucune communication' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {communications.length === 0 
                    ? 'Commencez par envoyer votre première communication'
                    : 'Aucune communication ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCommunications.map((comm) => {
                  const IconComponent = getTypeIcon(comm.type);
                  return (
                    <div key={comm.id} className="p-6 hover:bg-amber-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`p-2 rounded-lg ${getTypeColor(comm.type).replace('text-', 'bg-').replace('800', '200')}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-slate-900">
                                {comm.subject || `${getTypeLabel(comm.type)} - ${comm.type === 'email' ? 'Sans sujet' : 'Message'}`}
                              </h3>
                              <Badge className={getTypeColor(comm.type)}>{getTypeLabel(comm.type)}</Badge>
                              <Badge className={getStatusColor(comm.status)}>{getStatusLabel(comm.status)}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 mb-3">
                              <div>
                                <span className="font-medium">Client: </span>
                                {comm.client_name || 'Non associé'}
                              </div>
                              <div>
                                <span className="font-medium">Direction: </span>
                                {comm.direction === 'outbound' ? 'Sortant' : 'Entrant'}
                              </div>
                              <div>
                                <span className="font-medium">À: </span>
                                {comm.to_address}
                              </div>
                            </div>
                            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border mb-3">
                              <p className="line-clamp-2">{comm.content}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-500">
                                {new Date(comm.created_at).toLocaleString('fr-FR')}
                              </span>
                              {comm.case_title && (
                                <Badge variant="outline" className="text-xs">
                                  Dossier: {comm.case_title}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-500">#{comm.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Communications;
