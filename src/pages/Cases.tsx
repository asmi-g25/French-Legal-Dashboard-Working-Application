import React, { useState, useEffect } from 'react';
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
import Layout from '@/components/Layout';
import SubscriptionGuard, { useSubscriptionGuard } from '@/components/SubscriptionGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Plus, Search, FileText, Calendar, DollarSign, Clock, Edit, Trash2, User, Crown } from 'lucide-react';

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  case_type: string;
  status: 'open' | 'in_progress' | 'closed' | 'pending' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_id: string;
  court_name: string | null;
  judge_name: string | null;
  opposing_party: string | null;
  opposing_counsel: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  created_at: string;
  client?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
  };
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
}

const Cases = () => {
  const { user, canPerformAction } = useAuth();
  const { toast } = useToast();
  const { checkAccess } = useSubscriptionGuard();
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: '',
    status: 'open' as Case['status'],
    priority: 'medium' as Case['priority'],
    client_id: '',
    court_name: '',
    judge_name: '',
    opposing_party: '',
    opposing_counsel: '',
    start_date: '',
    expected_end_date: '',
    hourly_rate: '',
    estimated_hours: '',
  });

  useEffect(() => {
    loadCases();
    loadClients();
  }, []);

  const loadCases = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          client:clients(first_name, last_name, company_name)
        `)
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCases(data || []);
    } catch (error: any) {
      console.error('Error loading cases:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les dossiers: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
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

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const generateCaseNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CASE-${year}-${random}`;
  };

  const handleAddCase = async () => {
    // Check subscription limits before creating
    const canCreate = await checkAccess('create_case');
    if (!canCreate) {
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de dossiers pour votre plan. Mettez à niveau pour en créer davantage.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.case_type || !formData.client_id) {
      toast({
        title: "Erreur",
        description: "Le titre, type de dossier et client sont requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cases')
        .insert({
          firm_id: user?.id,
          case_number: generateCaseNumber(),
          title: formData.title,
          description: formData.description || null,
          case_type: formData.case_type,
          status: formData.status,
          priority: formData.priority,
          client_id: formData.client_id,
          court_name: formData.court_name || null,
          judge_name: formData.judge_name || null,
          opposing_party: formData.opposing_party || null,
          opposing_counsel: formData.opposing_counsel || null,
          start_date: formData.start_date || null,
          expected_end_date: formData.expected_end_date || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        })
        .select(`
          *,
          client:clients(first_name, last_name, company_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      setCases([data, ...cases]);
      setIsAddModalOpen(false);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Dossier créé avec succès",
      });
    } catch (error: any) {
      console.error('Error creating case:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer le dossier: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCase = async () => {
    if (!editingCase) return;

    try {
      const { data, error } = await supabase
        .from('cases')
        .update({
          title: formData.title,
          description: formData.description || null,
          case_type: formData.case_type,
          status: formData.status,
          priority: formData.priority,
          client_id: formData.client_id,
          court_name: formData.court_name || null,
          judge_name: formData.judge_name || null,
          opposing_party: formData.opposing_party || null,
          opposing_counsel: formData.opposing_counsel || null,
          start_date: formData.start_date || null,
          expected_end_date: formData.expected_end_date || null,
          actual_end_date: formData.status === 'closed' ? new Date().toISOString().split('T')[0] : null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        })
        .eq('id', editingCase.id)
        .select(`
          *,
          client:clients(first_name, last_name, company_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      setCases(cases.map(c => c.id === editingCase.id ? data : c));
      setEditingCase(null);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Dossier mis à jour avec succès",
      });
    } catch (error: any) {
      console.error('Error updating case:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le dossier: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ?')) return;

    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) {
        throw error;
      }

      setCases(cases.filter(c => c.id !== caseId));
      
      toast({
        title: "Succès",
        description: "Dossier supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting case:', error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer le dossier: ${error?.message || error?.toString() || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      case_type: '',
      status: 'open',
      priority: 'medium',
      client_id: '',
      court_name: '',
      judge_name: '',
      opposing_party: '',
      opposing_counsel: '',
      start_date: '',
      expected_end_date: '',
      hourly_rate: '',
      estimated_hours: '',
    });
  };

  const openEditModal = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      title: caseItem.title,
      description: caseItem.description || '',
      case_type: caseItem.case_type,
      status: caseItem.status,
      priority: caseItem.priority,
      client_id: caseItem.client_id,
      court_name: caseItem.court_name || '',
      judge_name: caseItem.judge_name || '',
      opposing_party: caseItem.opposing_party || '',
      opposing_counsel: caseItem.opposing_counsel || '',
      start_date: caseItem.start_date || '',
      expected_end_date: caseItem.expected_end_date || '',
      hourly_rate: caseItem.hourly_rate?.toString() || '',
      estimated_hours: caseItem.estimated_hours?.toString() || '',
    });
  };

  const getClientName = (client: Case['client']) => {
    if (!client) return 'Client non trouvé';
    if (client.company_name) return client.company_name;
    return `${client.first_name} ${client.last_name}`;
  };

  const getStatusColor = (status: Case['status']) => {
    const colors = {
      open: 'bg-blue-50 text-blue-700 border-blue-200',
      in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      closed: 'bg-gray-50 text-gray-700 border-gray-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      won: 'bg-green-50 text-green-700 border-green-200',
      lost: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority: Case['priority']) => {
    const colors = {
      low: 'bg-slate-50 text-slate-600 border-slate-200',
      medium: 'bg-blue-50 text-blue-600 border-blue-200',
      high: 'bg-orange-50 text-orange-600 border-orange-200',
      urgent: 'bg-red-50 text-red-600 border-red-200',
    };
    return colors[priority];
  };

  const filteredCases = cases.filter(caseItem =>
    searchTerm === '' ||
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.case_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(caseItem.client).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Chargement des dossiers..." className="h-64" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Gestion des Dossiers
          </h1>
          <SubscriptionGuard action="create_case" showUpgradePrompt={false}>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau dossier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre du dossier *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Titre du dossier"
                  />
                </div>

                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || `${client.first_name} ${client.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="case_type">Type de dossier *</Label>
                    <Input
                      id="case_type"
                      value={formData.case_type}
                      onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                      placeholder="Ex: Divorce, Commercial..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priorité</Label>
                    <Select value={formData.priority} onValueChange={(value: Case['priority']) => setFormData({...formData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description du dossier..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="court_name">Tribunal</Label>
                    <Input
                      id="court_name"
                      value={formData.court_name}
                      onChange={(e) => setFormData({...formData, court_name: e.target.value})}
                      placeholder="Nom du tribunal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="judge_name">Juge</Label>
                    <Input
                      id="judge_name"
                      value={formData.judge_name}
                      onChange={(e) => setFormData({...formData, judge_name: e.target.value})}
                      placeholder="Nom du juge"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opposing_party">Partie adverse</Label>
                    <Input
                      id="opposing_party"
                      value={formData.opposing_party}
                      onChange={(e) => setFormData({...formData, opposing_party: e.target.value})}
                      placeholder="Nom de la partie adverse"
                    />
                  </div>
                  <div>
                    <Label htmlFor="opposing_counsel">Avocat adverse</Label>
                    <Input
                      id="opposing_counsel"
                      value={formData.opposing_counsel}
                      onChange={(e) => setFormData({...formData, opposing_counsel: e.target.value})}
                      placeholder="Nom de l'avocat adverse"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Date de début</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected_end_date">Date de fin prévue</Label>
                    <Input
                      id="expected_end_date"
                      type="date"
                      value={formData.expected_end_date}
                      onChange={(e) => setFormData({...formData, expected_end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hourly_rate">Taux horaire (€)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_hours">Heures estimées</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                      placeholder="20"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleAddCase} className="flex-1">
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </SubscriptionGuard>
        </div>

        {/* Search */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par titre, numéro, type, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-300 focus:border-amber-500"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {cases.length === 0 ? 'Aucun dossier' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {cases.length === 0 
                    ? 'Commencez par créer votre premier dossier'
                    : 'Aucun dossier ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredCases.map((caseItem) => (
                  <Card key={caseItem.id} className="hover:shadow-lg transition-all duration-300 border-slate-200 bg-gradient-to-r from-white to-amber-50/30">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="bg-gradient-to-r from-amber-100 to-amber-200 rounded-full p-2">
                              <FileText className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-800">
                                {caseItem.title}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className={`border font-medium ${getStatusColor(caseItem.status)}`}>
                                  {caseItem.status === 'open' ? 'Ouvert' :
                                   caseItem.status === 'in_progress' ? 'En cours' :
                                   caseItem.status === 'closed' ? 'Fermé' :
                                   caseItem.status === 'pending' ? 'En attente' :
                                   caseItem.status === 'won' ? 'Gagné' : 'Perdu'}
                                </Badge>
                                <Badge variant="outline" className={`border font-medium ${getPriorityColor(caseItem.priority)}`}>
                                  {caseItem.priority === 'low' ? 'Faible' :
                                   caseItem.priority === 'medium' ? 'Moyenne' :
                                   caseItem.priority === 'high' ? 'Élevée' : 'Urgente'}
                                </Badge>
                                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                  {caseItem.case_number}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-amber-600" />
                              <span>{getClientName(caseItem.client)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-amber-600" />
                              <span>{caseItem.case_type}</span>
                            </div>
                            {caseItem.start_date && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-amber-600" />
                                <span>Début: {new Date(caseItem.start_date).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                            {caseItem.hourly_rate && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-amber-600" />
                                <span>{caseItem.hourly_rate}€/h</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 text-sm">
                            <span className="text-slate-500">Créé le: </span>
                            <span className="font-medium text-slate-700">
                              {new Date(caseItem.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(caseItem)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCase(caseItem.id)}
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

      {/* Edit Modal - Similar to Add Modal but for editing */}
      <Dialog open={!!editingCase} onOpenChange={() => setEditingCase(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Titre du dossier *</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre du dossier"
              />
            </div>

            <div>
              <Label htmlFor="edit_client">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name || `${client.first_name} ${client.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_case_type">Type de dossier *</Label>
                <Input
                  id="edit_case_type"
                  value={formData.case_type}
                  onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                  placeholder="Ex: Divorce, Commercial..."
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Statut</Label>
                <Select value={formData.status} onValueChange={(value: Case['status']) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                    <SelectItem value="won">Gagné</SelectItem>
                    <SelectItem value="lost">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_priority">Priorité</Label>
              <Select value={formData.priority} onValueChange={(value: Case['priority']) => setFormData({...formData, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du dossier..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setEditingCase(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleUpdateCase} className="flex-1">
                Mettre à jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Cases;
