import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { checkDatabaseSetup } from '@/utils/databaseSetup';
import Layout from '@/components/Layout';
import SubscriptionGuard, { useSubscriptionGuard } from '@/components/SubscriptionGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Plus, Search, Filter, User, Mail, Phone, MapPin, Edit, Trash2, Users, Crown } from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company_name: string | null;
  client_type: 'individual' | 'company';
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
}

const Clients = () => {
  const { user, canPerformAction } = useAuth();
  const { toast } = useToast();
  const { checkAccess } = useSubscriptionGuard();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    client_type: 'individual' as 'individual' | 'company',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First check if database is properly set up
      const dbCheck = await checkDatabaseSetup();
      if (!dbCheck.success) {
        throw new Error(`Base de données non configurée: ${dbCheck.error}. Veuillez exécuter la migration SQL dans Supabase.`);
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les clients: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    // Check subscription limits before creating
    const canCreate = await checkAccess('add_client');
    if (!canCreate) {
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de clients pour votre plan. Mettez à niveau pour en ajouter davantage.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.first_name || !formData.last_name) {
      toast({
        title: "Erreur",
        description: "Le prénom et nom sont requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          firm_id: user?.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          company_name: formData.company_name || null,
          client_type: formData.client_type,
          status: formData.status,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setClients([data, ...clients]);
      setIsAddModalOpen(false);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Client ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter le client: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          company_name: formData.company_name || null,
          client_type: formData.client_type,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq('id', editingClient.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setClients(clients.map(c => c.id === editingClient.id ? data : c));
      setEditingClient(null);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Client mis à jour avec succès",
      });
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le client: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      setClients(clients.filter(c => c.id !== clientId));
      
      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer le client: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      company_name: '',
      client_type: 'individual',
      status: 'active',
      notes: '',
    });
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      company_name: client.company_name || '',
      client_type: client.client_type,
      status: client.status,
      notes: client.notes || '',
    });
  };

  const filteredClients = clients.filter(client =>
    searchTerm === '' ||
    client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayName = (client: Client) => {
    if (client.client_type === 'company' && client.company_name) {
      return client.company_name;
    }
    return `${client.first_name} ${client.last_name}`;
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Chargement des clients..." className="h-64" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Gestion des Clients
          </h1>
          <SubscriptionGuard action="add_client" showUpgradePrompt={false}>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="client_type">Type de client</Label>
                  <Select value={formData.client_type} onValueChange={(value: 'individual' | 'company') => setFormData({...formData, client_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Particulier</SelectItem>
                      <SelectItem value="company">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.client_type === 'company' && (
                  <div>
                    <Label htmlFor="company_name">Nom de l'entreprise</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Adresse complète"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notes internes..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleAddClient} className="flex-1">
                    Ajouter
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </SubscriptionGuard>
        </div>

        {/* Search and Filters */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-amber-500"
                />
              </div>
              <Button variant="outline" className="border-slate-300 hover:border-amber-500 hover:bg-amber-50">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {clients.length === 0 ? 'Aucun client' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {clients.length === 0 
                    ? 'Commencez par ajouter votre premier client'
                    : 'Aucun client ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredClients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-all duration-300 border-slate-200 bg-gradient-to-r from-white to-amber-50/30">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="bg-gradient-to-r from-amber-100 to-amber-200 rounded-full p-2">
                              <User className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-800">
                                {getDisplayName(client)}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className={`border-amber-200 border font-medium ${client.client_type === 'company' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {client.client_type === 'company' ? 'Entreprise' : 'Particulier'}
                                </Badge>
                                <Badge variant="outline" className={`border font-medium ${client.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                  {client.status === 'active' ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                            {client.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-amber-600" />
                                <span>{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-amber-600" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {client.address && (
                              <div className="flex items-start space-x-2 md:col-span-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-amber-600" />
                                <span>{client.address}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-6 mt-4 text-sm">
                            <div>
                              <span className="text-slate-500">Créé le: </span>
                              <span className="font-medium text-slate-700">
                                {new Date(client.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            #{client.id.slice(0, 8)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(client)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClient(client.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">Prénom *</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Nom *</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  placeholder="Nom"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_client_type">Type de client</Label>
              <Select value={formData.client_type} onValueChange={(value: 'individual' | 'company') => setFormData({...formData, client_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="company">Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.client_type === 'company' && (
              <div>
                <Label htmlFor="edit_company_name">Nom de l'entreprise</Label>
                <Input
                  id="edit_company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Nom de l'entreprise"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Téléphone</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_address">Adresse</Label>
              <Textarea
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Adresse complète"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit_status">Statut</Label>
              <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes internes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setEditingClient(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleUpdateClient} className="flex-1">
                Mettre à jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Clients;
