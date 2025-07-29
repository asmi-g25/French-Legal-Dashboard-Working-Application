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
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, User, MapPin, Edit, Trash2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'hearing' | 'consultation' | 'meeting' | 'deadline' | 'other';
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  client_id: string | null;
  case_id: string | null;
  client_name?: string;
  case_title?: string;
  all_day: boolean;
  reminder_minutes: number | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

interface CalendarStats {
  todayEvents: number;
  thisWeekEvents: number;
  upcomingEvents: number;
}

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats>({
    todayEvents: 0,
    thisWeekEvents: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [clients, setClients] = useState<Array<{id: string, name: string}>>([]);
  const [cases, setCases] = useState<Array<{id: string, title: string, client_id: string}>>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'consultation' as CalendarEvent['event_type'],
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    client_id: '',
    case_id: '',
    all_day: false,
    reminder_minutes: 30,
    status: 'scheduled' as CalendarEvent['status'],
  });

  useEffect(() => {
    if (user?.id) {
      loadEvents();
      loadClients();
      loadCases();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          clients(first_name, last_name, company_name),
          cases(title)
        `)
        .eq('firm_id', user.id)
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      const eventsWithNames = data?.map(event => ({
        ...event,
        client_name: event.clients ? 
          (event.clients.company_name || `${event.clients.first_name} ${event.clients.last_name}`) : 
          null,
        case_title: event.cases?.title || null,
      })) || [];

      setEvents(eventsWithNames);
      calculateStats(eventsWithNames);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger le calendrier: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (eventsList: CalendarEvent[]) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const todayEvents = eventsList.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate.toDateString() === today.toDateString() && event.status === 'scheduled';
    }).length;

    const thisWeekEvents = eventsList.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate >= startOfWeek && eventDate <= endOfWeek && event.status === 'scheduled';
    }).length;

    const upcomingEvents = eventsList.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate > today && event.status === 'scheduled';
    }).length;

    setStats({ todayEvents, thisWeekEvents, upcomingEvents });
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

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.start_date || !user?.id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const startDateTime = formData.all_day 
        ? `${formData.start_date}T00:00:00`
        : `${formData.start_date}T${formData.start_time}:00`;
      
      const endDateTime = formData.all_day
        ? `${formData.end_date || formData.start_date}T23:59:59`
        : `${formData.end_date || formData.start_date}T${formData.end_time}:00`;

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          firm_id: user.id,
          title: formData.title,
          description: formData.description || null,
          event_type: formData.event_type,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          location: formData.location || null,
          client_id: formData.client_id || null,
          case_id: formData.case_id || null,
          all_day: formData.all_day,
          reminder_minutes: formData.reminder_minutes || null,
          status: formData.status,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Événement créé avec succès",
      });

      setIsAddModalOpen(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer l'événement: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !formData.title || !formData.start_date) return;

    try {
      const startDateTime = formData.all_day 
        ? `${formData.start_date}T00:00:00`
        : `${formData.start_date}T${formData.start_time}:00`;
      
      const endDateTime = formData.all_day
        ? `${formData.end_date || formData.start_date}T23:59:59`
        : `${formData.end_date || formData.start_date}T${formData.end_time}:00`;

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: formData.title,
          description: formData.description || null,
          event_type: formData.event_type,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          location: formData.location || null,
          client_id: formData.client_id || null,
          case_id: formData.case_id || null,
          all_day: formData.all_day,
          reminder_minutes: formData.reminder_minutes || null,
          status: formData.status,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Événement mis à jour avec succès",
      });

      setEditingEvent(null);
      resetForm();
      loadEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour l'événement: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Événement supprimé avec succès",
      });

      loadEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer l'événement: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'consultation',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      location: '',
      client_id: '',
      case_id: '',
      all_day: false,
      reminder_minutes: 30,
      status: 'scheduled',
    });
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);
    
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_date: startDate.toISOString().split('T')[0],
      start_time: event.all_day ? '' : startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: event.all_day ? '' : endDate.toTimeString().slice(0, 5),
      location: event.location || '',
      client_id: event.client_id || '',
      case_id: event.case_id || '',
      all_day: event.all_day,
      reminder_minutes: event.reminder_minutes || 30,
      status: event.status,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'bg-red-100 text-red-800';
      case 'consultation': return 'bg-blue-100 text-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'deadline': return 'bg-orange-100 text-orange-800';
      case 'other': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hearing': return 'Audience';
      case 'consultation': return 'Consultation';
      case 'meeting': return 'Réunion';
      case 'deadline': return 'Échéance';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  const getFilteredCases = () => {
    if (!formData.client_id) return [];
    return cases.filter(c => c.client_id === formData.client_id);
  };

  const formatDateTime = (datetime: string, allDay: boolean) => {
    const date = new Date(datetime);
    if (allDay) {
      return date.toLocaleDateString('fr-FR');
    }
    return date.toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate.toDateString() === today.toDateString();
    }).slice(0, 5);
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate > today && event.status === 'scheduled';
    }).slice(0, 5);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement du calendrier...</p>
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
            Calendrier
          </h1>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Rendez-vous
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un nouvel événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Titre de l'événement"
                  />
                </div>

                <div>
                  <Label htmlFor="event_type">Type d'événement</Label>
                  <Select value={formData.event_type} onValueChange={(value: any) => setFormData({...formData, event_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="hearing">Audience</SelectItem>
                      <SelectItem value="meeting">Réunion</SelectItem>
                      <SelectItem value="deadline">Échéance</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client_id">Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value, case_id: ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client (optionnel)" />
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="all_day"
                    checked={formData.all_day}
                    onChange={(e) => setFormData({...formData, all_day: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="all_day">Événement toute la journée</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Date de début *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  {!formData.all_day && (
                    <div>
                      <Label htmlFor="start_time">Heure de début</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                {!formData.all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="end_date">Date de fin</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">Heure de fin</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="location">Lieu</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Lieu de l'événement"
                  />
                </div>

                <div>
                  <Label htmlFor="reminder_minutes">Rappel (minutes)</Label>
                  <Select value={formData.reminder_minutes.toString()} onValueChange={(value) => setFormData({...formData, reminder_minutes: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="1440">1 jour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description de l'événement..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleCreateEvent} disabled={isCreating} className="flex-1">
                    {isCreating ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{stats.todayEvents}</p>
                  <p className="text-sm text-blue-600">Événements aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{stats.thisWeekEvents}</p>
                  <p className="text-sm text-green-600">Cette semaine</p>
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
                  <p className="text-2xl font-bold text-orange-800">{stats.upcomingEvents}</p>
                  <p className="text-sm text-orange-600">À venir</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Events */}
          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <span>Événements d'aujourd'hui</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {getTodayEvents().length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">Aucun événement aujourd'hui</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {getTodayEvents().map((event) => (
                    <div key={event.id} className="p-4 hover:bg-blue-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{event.title}</h3>
                            <Badge className={getTypeColor(event.event_type)}>
                              {getTypeLabel(event.event_type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDateTime(event.start_datetime, event.all_day)}
                          </p>
                          {event.client_name && (
                            <p className="text-sm text-slate-600">
                              <User className="h-3 w-3 inline mr-1" />
                              {event.client_name}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-sm text-slate-600">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(event)}
                            className="text-amber-600 hover:bg-amber-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-orange-50 border-b border-slate-200">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Événements à venir</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {getUpcomingEvents().length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">Aucun événement à venir</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {getUpcomingEvents().map((event) => (
                    <div key={event.id} className="p-4 hover:bg-orange-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{event.title}</h3>
                            <Badge className={getTypeColor(event.event_type)}>
                              {getTypeLabel(event.event_type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            {formatDateTime(event.start_datetime, event.all_day)}
                          </p>
                          {event.client_name && (
                            <p className="text-sm text-slate-600">
                              <User className="h-3 w-3 inline mr-1" />
                              {event.client_name}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-sm text-slate-600">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(event)}
                            className="text-amber-600 hover:bg-amber-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div>
              <Label htmlFor="edit_title">Titre *</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de l'événement"
              />
            </div>

            <div>
              <Label htmlFor="edit_event_type">Type d'événement</Label>
              <Select value={formData.event_type} onValueChange={(value: any) => setFormData({...formData, event_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="hearing">Audience</SelectItem>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="deadline">Échéance</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_client_id">Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value, case_id: ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client (optionnel)" />
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
              <Label htmlFor="edit_case_id">Dossier</Label>
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData({...formData, all_day: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="edit_all_day">Événement toute la journée</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_date">Date de début *</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              {!formData.all_day && (
                <div>
                  <Label htmlFor="edit_start_time">Heure de d��but</Label>
                  <Input
                    id="edit_start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
              )}
            </div>

            {!formData.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_end_date">Date de fin</Label>
                  <Input
                    id="edit_end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_end_time">Heure de fin</Label>
                  <Input
                    id="edit_end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="edit_location">Lieu</Label>
              <Input
                id="edit_location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Lieu de l'événement"
              />
            </div>

            <div>
              <Label htmlFor="edit_status">Statut</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programmé</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description de l'événement..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setEditingEvent(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleUpdateEvent} className="flex-1">
                Mettre à jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Calendar;
