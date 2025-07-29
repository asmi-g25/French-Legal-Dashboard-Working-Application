import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { useToast } from '@/hooks/use-toast';
import { Timer, Play, Pause, Square, Clock, DollarSign, Crown, FileText, Calculator } from 'lucide-react';

interface TimeEntry {
  id: string;
  case_id: string;
  description: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  hourly_rate: number | null;
  billable_amount: number | null;
  is_billable: boolean;
  created_at: string;
  case?: {
    title: string;
    case_number: string;
  };
}

interface Case {
  id: string;
  title: string;
  case_number: string;
  hourly_rate: number | null;
}

const TimeTracker: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(25000);
  const [isBillable, setIsBillable] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCases();
    loadTimeEntries();
    loadActiveTimer();
    
    // Update current time every second
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [user]);

  const loadCases = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, title, case_number, hourly_rate')
        .eq('firm_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          case:cases(title, case_number)
        `)
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const loadActiveTimer = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          case:cases(title, case_number)
        `)
        .eq('firm_id', user.id)
        .is('end_time', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setActiveTimer(data[0]);
      }
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };

  const startTimer = async () => {
    if (!user?.id || !selectedCaseId || !description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un dossier et ajouter une description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          firm_id: user.id,
          case_id: selectedCaseId,
          description: description,
          start_time: new Date().toISOString(),
          hourly_rate: hourlyRate,
          is_billable: isBillable,
        })
        .select(`
          *,
          case:cases(title, case_number)
        `)
        .single();

      if (error) throw error;

      setActiveTimer(data);
      setDescription('');
      
      toast({
        title: "Succès",
        description: "Chronomètre démarré",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    setLoading(true);
    try {
      const endTime = new Date();
      const startTime = new Date(activeTimer.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const billableAmount = activeTimer.is_billable && activeTimer.hourly_rate 
        ? (activeTimer.hourly_rate / 60) * durationMinutes 
        : 0;

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          billable_amount: billableAmount,
        })
        .eq('id', activeTimer.id);

      if (error) throw error;

      setActiveTimer(null);
      loadTimeEntries();
      
      toast({
        title: "Succès",
        description: `Temps enregistré: ${formatDuration(durationMinutes)}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pauseTimer = async () => {
    if (!activeTimer) return;
    await stopTimer();
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getElapsedTime = (): string => {
    if (!activeTimer) return '00:00:00';
    
    const startTime = new Date(activeTimer.start_time);
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalBillableToday = (): number => {
    const today = new Date().toDateString();
    return timeEntries
      .filter(entry => entry.created_at.startsWith(new Date().toISOString().split('T')[0]))
      .reduce((total, entry) => total + (entry.billable_amount || 0), 0);
  };

  const getTotalTimeToday = (): number => {
    const today = new Date().toDateString();
    return timeEntries
      .filter(entry => entry.created_at.startsWith(new Date().toISOString().split('T')[0]))
      .reduce((total, entry) => total + (entry.duration_minutes || 0), 0);
  };

  return (
    <SubscriptionGuard feature="time_tracking">
      <div className="space-y-6">
        {/* Timer Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>Suivi du Temps</span>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTimer ? (
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-green-600 mb-2">
                  {getElapsedTime()}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {activeTimer.case?.case_number} - {activeTimer.description}
                </p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={pauseTimer} variant="outline" disabled={loading}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button onClick={stopTimer} variant="destructive" disabled={loading}>
                    <Square className="h-4 w-4 mr-2" />
                    Arrêter
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="case">Dossier *</Label>
                    <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un dossier" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((caseItem) => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.case_number} - {caseItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rate">Taux horaire (FCFA)</Label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      min="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description de la tâche *</Label>
                  <Textarea
                    placeholder="Ex: Rédaction conclusions, recherche jurisprudence..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={isBillable}
                    onChange={(e) => setIsBillable(e.target.checked)}
                  />
                  <Label htmlFor="billable">Temps facturable</Label>
                </div>

                <Button onClick={startTimer} disabled={loading} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer le chrono
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Temps aujourd'hui</p>
                  <p className="text-xl font-bold">{formatDuration(getTotalTimeToday())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Facturable aujourd'hui</p>
                  <p className="text-xl font-bold">{formatCurrency(getTotalBillableToday())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Entrées récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-gray-600">
                        {entry.case?.case_number} - {entry.case?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'En cours...'}
                    </p>
                    {entry.billable_amount && (
                      <p className="text-sm text-green-600">
                        {formatCurrency(entry.billable_amount)}
                      </p>
                    )}
                    {entry.is_billable && (
                      <Badge variant="outline" className="text-xs">
                        Facturable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {timeEntries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune entrée de temps enregistrée</p>
                  <p className="text-sm">Commencez par démarrer un chrono</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SubscriptionGuard>
  );
};

export default TimeTracker;
