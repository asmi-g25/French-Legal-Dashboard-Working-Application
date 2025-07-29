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
import { Search, Plus, Phone, Mail, MapPin, User, Building, Scale, Edit, Trash2 } from 'lucide-react';

interface Contact {
  id: string;
  contact_type: 'lawyer' | 'accountant' | 'medical_expert' | 'bailiff' | 'other';
  first_name: string;
  last_name: string;
  company_name: string | null;
  title: string | null;
  speciality: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  last_contact_date: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface ContactStats {
  lawyers: number;
  accountants: number;
  medicalExperts: number;
  bailiffs: number;
}

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    lawyers: 0,
    accountants: 0,
    medicalExperts: 0,
    bailiffs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    contact_type: 'lawyer' as Contact['contact_type'],
    first_name: '',
    last_name: '',
    company_name: '',
    title: '',
    speciality: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (user?.id) {
      loadContacts();
      loadStats();
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('*')
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les contacts: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('professional_contacts')
        .select('contact_type')
        .eq('firm_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const counts = (data || []).reduce((acc, contact) => {
        switch (contact.contact_type) {
          case 'lawyer': acc.lawyers++; break;
          case 'accountant': acc.accountants++; break;
          case 'medical_expert': acc.medicalExperts++; break;
          case 'bailiff': acc.bailiffs++; break;
        }
        return acc;
      }, { lawyers: 0, accountants: 0, medicalExperts: 0, bailiffs: 0 });

      setStats(counts);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddContact = async () => {
    if (!formData.first_name || !formData.last_name || !user?.id) {
      toast({
        title: "Erreur",
        description: "Le prénom et nom sont requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('professional_contacts')
        .insert({
          firm_id: user.id,
          contact_type: formData.contact_type,
          first_name: formData.first_name,
          last_name: formData.last_name,
          company_name: formData.company_name || null,
          title: formData.title || null,
          speciality: formData.speciality || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
          status: formData.status,
        })
        .select()
        .single();

      if (error) throw error;

      setContacts([data, ...contacts]);
      setIsAddModalOpen(false);
      resetForm();
      loadStats();
      
      toast({
        title: "Succès",
        description: "Contact ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter le contact: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact || !formData.first_name || !formData.last_name) return;

    try {
      const { data, error } = await supabase
        .from('professional_contacts')
        .update({
          contact_type: formData.contact_type,
          first_name: formData.first_name,
          last_name: formData.last_name,
          company_name: formData.company_name || null,
          title: formData.title || null,
          speciality: formData.speciality || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
          status: formData.status,
        })
        .eq('id', editingContact.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(contacts.map(c => c.id === editingContact.id ? data : c));
      setEditingContact(null);
      resetForm();
      loadStats();
      
      toast({
        title: "Succès",
        description: "Contact mis à jour avec succès",
      });
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le contact: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      const { error } = await supabase
        .from('professional_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setContacts(contacts.filter(c => c.id !== contactId));
      loadStats();
      
      toast({
        title: "Succès",
        description: "Contact supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer le contact: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      contact_type: 'lawyer',
      first_name: '',
      last_name: '',
      company_name: '',
      title: '',
      speciality: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      status: 'active',
    });
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      contact_type: contact.contact_type,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company_name: contact.company_name || '',
      title: contact.title || '',
      speciality: contact.speciality || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      status: contact.status,
    });
  };

  const getDisplayName = (contact: Contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`;
    return contact.title ? `${contact.title} ${fullName}` : fullName;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lawyer': return 'bg-blue-100 text-blue-800';
      case 'accountant': return 'bg-green-100 text-green-800';
      case 'medical_expert': return 'bg-purple-100 text-purple-800';
      case 'bailiff': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lawyer': return 'Avocat';
      case 'accountant': return 'Expert-comptable';
      case 'medical_expert': return 'Expert médical';
      case 'bailiff': return 'Huissier';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lawyer': return Scale;
      case 'accountant': return Building;
      case 'medical_expert': return User;
      case 'bailiff': return User;
      default: return User;
    }
  };

  const filteredContacts = contacts.filter(contact =>
    searchTerm === '' ||
    contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.speciality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement des contacts...</p>
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
            Carnet de Contacts
          </h1>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div>
                  <Label htmlFor="contact_type">Type de contact *</Label>
                  <Select value={formData.contact_type} onValueChange={(value: any) => setFormData({...formData, contact_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lawyer">Avocat</SelectItem>
                      <SelectItem value="accountant">Expert-comptable</SelectItem>
                      <SelectItem value="medical_expert">Expert médical</SelectItem>
                      <SelectItem value="bailiff">Huissier</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Me., Dr., etc."
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Entreprise</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Nom de l'entreprise"
                  />
                </div>

                <div>
                  <Label htmlFor="speciality">Spécialité</Label>
                  <Input
                    id="speciality"
                    value={formData.speciality}
                    onChange={(e) => setFormData({...formData, speciality: e.target.value})}
                    placeholder="Domaine de spécialité"
                  />
                </div>

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
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
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
                  <Button onClick={handleAddContact} className="flex-1">
                    Ajouter
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
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{stats.lawyers}</p>
                  <p className="text-sm text-blue-600">Avocats</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{stats.accountants}</p>
                  <p className="text-sm text-green-600">Experts-comptables</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-lg p-2">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-800">{stats.medicalExperts}</p>
                  <p className="text-sm text-purple-600">Experts médicaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-800">{stats.bailiffs}</p>
                  <p className="text-sm text-orange-600">Huissiers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts List */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom, spécialité, entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-amber-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {contacts.length === 0 ? 'Aucun contact' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {contacts.length === 0 
                    ? 'Commencez par ajouter votre premier contact professionnel'
                    : 'Aucun contact ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => {
                  const IconComponent = getTypeIcon(contact.contact_type);
                  return (
                    <div key={contact.id} className="p-6 hover:bg-amber-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`p-3 rounded-lg ${getTypeColor(contact.contact_type).replace('text-', 'bg-').replace('800', '200')}`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">{getDisplayName(contact)}</h3>
                              <Badge className={getTypeColor(contact.contact_type)}>{getTypeLabel(contact.contact_type)}</Badge>
                              {contact.status === 'inactive' && (
                                <Badge variant="outline" className="text-gray-500">Inactif</Badge>
                              )}
                            </div>
                            
                            {contact.company_name && (
                              <p className="text-slate-600 mb-3 font-medium">{contact.company_name}</p>
                            )}
                            
                            {contact.speciality && (
                              <p className="text-sm text-slate-600 mb-3">{contact.speciality}</p>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600 mb-3">
                              {contact.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-amber-600" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-amber-600" />
                                  <span>{contact.email}</span>
                                </div>
                              )}
                              {contact.address && (
                                <div className="flex items-start space-x-2 md:col-span-2">
                                  <MapPin className="h-4 w-4 mt-0.5 text-amber-600" />
                                  <span>{contact.address}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-sm">
                              <span className="text-slate-500">Créé le: </span>
                              <span className="font-medium text-slate-700">
                                {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                              </span>
                              {contact.last_contact_date && (
                                <>
                                  <span className="text-slate-500 ml-4">Dernier contact: </span>
                                  <span className="font-medium text-slate-700">
                                    {new Date(contact.last_contact_date).toLocaleDateString('fr-FR')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-500">#{contact.id.slice(0, 8)}</span>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(contact)}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteContact(contact.id)}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Edit Modal */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div>
              <Label htmlFor="edit_contact_type">Type de contact *</Label>
              <Select value={formData.contact_type} onValueChange={(value: any) => setFormData({...formData, contact_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lawyer">Avocat</SelectItem>
                  <SelectItem value="accountant">Expert-comptable</SelectItem>
                  <SelectItem value="medical_expert">Expert médical</SelectItem>
                  <SelectItem value="bailiff">Huissier</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="edit_title">Titre</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Me., Dr., etc."
              />
            </div>

            <div>
              <Label htmlFor="edit_company_name">Entreprise</Label>
              <Input
                id="edit_company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <Label htmlFor="edit_speciality">Spécialité</Label>
              <Input
                id="edit_speciality"
                value={formData.speciality}
                onChange={(e) => setFormData({...formData, speciality: e.target.value})}
                placeholder="Domaine de spécialité"
              />
            </div>

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
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
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
              <Button variant="outline" onClick={() => setEditingContact(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleUpdateContact} className="flex-1">
                Mettre à jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Contacts;
