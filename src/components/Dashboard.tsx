import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  totalCases: number;
  activeCases: number;
  pendingTasks: number;
  monthlyRevenue: number;
  recentClients: Array<{
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    created_at: string;
  }>;
  recentCases: Array<{
    id: string;
    title: string;
    case_number: string;
    status: string;
    priority: string;
    created_at: string;
    client?: {
      first_name: string;
      last_name: string;
      company_name: string | null;
    };
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    expected_end_date: string;
    priority: string;
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalCases: 0,
    activeCases: 0,
    pendingTasks: 0,
    monthlyRevenue: 0,
    recentClients: [],
    recentCases: [],
    upcomingDeadlines: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        clientsResult,
        casesResult,
        recentClientsResult,
        recentCasesResult,
        upcomingDeadlinesResult,
        invoicesResult
      ] = await Promise.all([
        // Total clients
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('firm_id', user.id),
        
        // Total and active cases
        supabase
          .from('cases')
          .select('id, status', { count: 'exact' })
          .eq('firm_id', user.id),
        
        // Recent clients (last 5)
        supabase
          .from('clients')
          .select('id, first_name, last_name, company_name, created_at')
          .eq('firm_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Recent cases (last 5)
        supabase
          .from('cases')
          .select(`
            id, title, case_number, status, priority, created_at,
            client:clients(first_name, last_name, company_name)
          `)
          .eq('firm_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Upcoming deadlines (next 30 days)
        supabase
          .from('cases')
          .select('id, title, expected_end_date, priority')
          .eq('firm_id', user.id)
          .not('expected_end_date', 'is', null)
          .gte('expected_end_date', new Date().toISOString().split('T')[0])
          .lte('expected_end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('expected_end_date', { ascending: true }),
        
        // Monthly revenue from invoices
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('firm_id', user.id)
          .eq('status', 'paid')
          .gte('paid_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      // Process results
      const totalClients = clientsResult.count || 0;
      const totalCases = casesResult.count || 0;
      const activeCases = casesResult.data?.filter(c => c.status === 'open' || c.status === 'in_progress').length || 0;
      const monthlyRevenue = invoicesResult.data?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0;

      setStats({
        totalClients,
        totalCases,
        activeCases,
        pendingTasks: upcomingDeadlinesResult.data?.length || 0,
        monthlyRevenue,
        recentClients: recentClientsResult.data || [],
        recentCases: recentCasesResult.data || [],
        upcomingDeadlines: upcomingDeadlinesResult.data || [],
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (client: { first_name: string; last_name: string; company_name: string | null }) => {
    if (client.company_name) return client.company_name;
    return `${client.first_name} ${client.last_name}`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-blue-50 text-blue-700',
      in_progress: 'bg-yellow-50 text-yellow-700',
      closed: 'bg-gray-50 text-gray-700',
      pending: 'bg-orange-50 text-orange-700',
      won: 'bg-green-50 text-green-700',
      lost: 'bg-red-50 text-red-700',
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-slate-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      open: 'Ouvert',
      in_progress: 'En cours',
      closed: 'Fermé',
      pending: 'En attente',
      won: 'Gagné',
      lost: 'Perdu',
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée',
      urgent: 'Urgente',
    };
    return priorityMap[priority] || priority;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-amber-50 rounded-lg p-6 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Bienvenue, {user?.firmName}
        </h1>
        <p className="text-slate-600">
          Voici un aperçu de votre activité récente et des tâches à venir.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Clients totaux
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{stats.totalClients}</div>
            <p className="text-xs text-blue-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Gestion active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              Dossiers actifs
            </CardTitle>
            <FileText className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{stats.activeCases}</div>
            <p className="text-xs text-amber-600">
              Sur {stats.totalCases} dossiers totaux
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Échéances proches
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">{stats.pendingTasks}</div>
            <p className="text-xs text-orange-600">
              Dans les 30 prochains jours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Revenus du mois
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-green-600">
              Factures payées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">
                Clients récents
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/clients')}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Aucun client récent</p>
                <Button
                  onClick={() => navigate('/clients')}
                  className="mt-3"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un client
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentClients.map((client) => (
                  <div key={client.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">
                          {getClientName(client)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Ajouté le {formatDate(client.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{client.id.slice(0, 6)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Cases */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">
                Dossiers récents
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cases')}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentCases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Aucun dossier récent</p>
                <Button
                  onClick={() => navigate('/cases')}
                  className="mt-3"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Créer un dossier
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentCases.map((caseItem) => (
                  <div key={caseItem.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 mb-1">
                          {caseItem.title}
                        </p>
                        <p className="text-sm text-slate-600 mb-2">
                          {caseItem.client ? getClientName(caseItem.client) : 'Client non trouvé'}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(caseItem.status)}`}>
                            {getStatusLabel(caseItem.status)}
                          </Badge>
                          <span className={`text-xs font-medium ${getPriorityColor(caseItem.priority)}`}>
                            {getPriorityLabel(caseItem.priority)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {caseItem.case_number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(caseItem.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      {stats.upcomingDeadlines.length > 0 && (
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg font-semibold text-orange-800">
                Échéances à venir (30 prochains jours)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100">
              {stats.upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="p-4 hover:bg-orange-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">
                        {deadline.title}
                      </p>
                      <p className="text-sm text-orange-600">
                        Échéance: {new Date(deadline.expected_end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getPriorityColor(deadline.priority)} border-current`}
                    >
                      {getPriorityLabel(deadline.priority)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Actions rapides
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/clients')}
              className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center space-x-2 h-12"
            >
              <Users className="h-5 w-5" />
              <span>Nouveau Client</span>
            </Button>
            <Button
              onClick={() => navigate('/cases')}
              className="bg-amber-600 hover:bg-amber-700 flex items-center justify-center space-x-2 h-12"
            >
              <FileText className="h-5 w-5" />
              <span>Nouveau Dossier</span>
            </Button>
            <Button
              onClick={() => navigate('/calendar')}
              className="bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2 h-12"
            >
              <Calendar className="h-5 w-5" />
              <span>Voir Agenda</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
