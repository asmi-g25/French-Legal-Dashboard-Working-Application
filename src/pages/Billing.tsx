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
import { Search, Plus, Download, Eye, Euro, TrendingUp, Clock, CheckCircle, Edit, Trash2, Send } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  case_id: string | null;
  client_name?: string;
  case_title?: string;
  amount_excluding_tax: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  paid_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  description: string | null;
  payment_terms: number;
  created_at: string;
  updated_at: string;
}

interface BillingStats {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

const Billing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [clients, setClients] = useState<Array<{id: string, name: string}>>([]);
  const [cases, setCases] = useState<Array<{id: string, title: string, client_id: string}>>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    case_id: '',
    amount_excluding_tax: 0,
    tax_rate: 20, // 20% VAT by default
    currency: 'EUR',
    payment_terms: 30, // 30 days by default
    description: '',
    status: 'draft' as Invoice['status'],
  });

  useEffect(() => {
    if (user?.id) {
      loadInvoices();
      loadClients();
      loadCases();
      loadStats();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(first_name, last_name, company_name),
          cases(title)
        `)
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invoicesWithNames = data?.map(invoice => ({
        ...invoice,
        client_name: invoice.clients ? 
          (invoice.clients.company_name || `${invoice.clients.first_name} ${invoice.clients.last_name}`) : 
          'Client supprimé',
        case_title: invoice.cases?.title || null,
      })) || [];

      setInvoices(invoicesWithNames);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les factures: ${error.message}`,
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
        .select('id, first_name, last_name, company_name')
        .eq('firm_id', user.id)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;

      const clientsWithNames = data?.map(client => ({
        id: client.id,
        name: client.company_name || `${client.first_name} ${client.last_name}`,
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
        .select('id, title, client_id')
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
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, status, due_date')
        .eq('firm_id', user.id);

      if (error) throw error;

      const today = new Date();
      const stats = (data || []).reduce((acc, invoice) => {
        acc.totalRevenue += invoice.total_amount;
        
        if (invoice.status === 'paid') {
          acc.paidAmount += invoice.total_amount;
        } else if (invoice.status === 'sent') {
          const dueDate = new Date(invoice.due_date);
          if (dueDate < today) {
            acc.overdueAmount += invoice.total_amount;
          } else {
            acc.pendingAmount += invoice.total_amount;
          }
        }
        
        return acc;
      }, { totalRevenue: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0 });

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FACT-${year}-${month}-${random}`;
  };

  const handleCreateInvoice = async () => {
    if (!formData.client_id || formData.amount_excluding_tax <= 0 || !user?.id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const taxAmount = (formData.amount_excluding_tax * formData.tax_rate) / 100;
      const totalAmount = formData.amount_excluding_tax + taxAmount;
      const invoiceDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + formData.payment_terms);

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          firm_id: user.id,
          client_id: formData.client_id,
          case_id: formData.case_id || null,
          invoice_number: generateInvoiceNumber(),
          amount_excluding_tax: formData.amount_excluding_tax,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency: formData.currency,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          status: formData.status,
          description: formData.description || null,
          payment_terms: formData.payment_terms,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Facture créée avec succès",
      });

      setIsAddModalOpen(false);
      resetForm();
      loadInvoices();
      loadStats();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer la facture: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Statut de la facture mis à jour",
      });

      loadInvoices();
      loadStats();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour la facture: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Facture supprimée avec succès",
      });

      loadInvoices();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer la facture: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      case_id: '',
      amount_excluding_tax: 0,
      tax_rate: 20,
      currency: 'EUR',
      payment_terms: 30,
      description: '',
      status: 'draft',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string, dueDate?: string) => {
    if (status === 'sent' && dueDate) {
      const today = new Date();
      const due = new Date(dueDate);
      if (due < today) {
        return 'En retard';
      }
    }
    
    switch (status) {
      case 'paid': return 'Payée';
      case 'sent': return 'Envoyée';
      case 'draft': return 'Brouillon';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getFilteredCases = () => {
    if (!formData.client_id) return [];
    return cases.filter(c => c.client_id === formData.client_id);
  };

  const filteredInvoices = invoices.filter(invoice =>
    searchTerm === '' ||
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.case_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement des factures...</p>
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
            Facturation
          </h1>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Facture
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle facture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client_id">Client *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value, case_id: ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="case_id">Dossier</Label>
                  <Select value={formData.case_id} onValueChange={(value) => setFormData({...formData, case_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Associer à un dossier (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredCases().map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount_excluding_tax">Montant HT *</Label>
                    <Input
                      id="amount_excluding_tax"
                      type="number"
                      step="0.01"
                      value={formData.amount_excluding_tax}
                      onChange={(e) => setFormData({...formData, amount_excluding_tax: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_rate">Taux TVA (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <Label>Montant TTC</Label>
                  <div className="p-2 bg-slate-50 rounded border">
                    {formatCurrency(formData.amount_excluding_tax + (formData.amount_excluding_tax * formData.tax_rate / 100))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Devise</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="XOF">XOF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_terms">Échéance (jours)</Label>
                    <Input
                      id="payment_terms"
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: parseInt(e.target.value) || 30})}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="sent">Envoyée</SelectItem>
                      <SelectItem value="paid">Payée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description des services fournis..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={isCreating} className="flex-1">
                    {isCreating ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Euro className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-sm text-blue-600">Chiffre d'affaires total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(stats.paidAmount)}</p>
                  <p className="text-sm text-green-600">Factures payées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 rounded-lg p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-800">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-sm text-yellow-600">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 rounded-lg p-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(stats.overdueAmount)}</p>
                  <p className="text-sm text-red-600">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher factures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-amber-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <Euro className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {invoices.length === 0 ? 'Aucune facture' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {invoices.length === 0 
                    ? 'Commencez par créer votre première facture'
                    : 'Aucune facture ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Numéro</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Dossier</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Montant</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Échéance</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-slate-100 hover:bg-amber-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{invoice.client_name}</td>
                        <td className="py-3 px-4 text-slate-600">{invoice.case_title || 'Non associé'}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{formatCurrency(invoice.total_amount, invoice.currency)}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(invoice.status)}>
                            {getStatusLabel(invoice.status, invoice.due_date)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            {invoice.status === 'sent' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateInvoiceStatus(invoice.id, 'paid')}
                                className="border-green-300 text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marquer payée
                              </Button>
                            )}
                            {invoice.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateInvoiceStatus(invoice.id, 'sent')}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Envoyer
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Billing;
