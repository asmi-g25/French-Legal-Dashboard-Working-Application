import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { Search, Filter, Calendar, User, FileText, Crown } from 'lucide-react';

interface SearchFilters {
  query: string;
  type: 'all' | 'cases' | 'clients' | 'documents';
  status: string;
  dateFrom: string;
  dateTo: string;
  priority: string;
  caseType: string;
  clientType: string;
}

interface SearchResult {
  id: string;
  type: 'case' | 'client' | 'document';
  title: string;
  subtitle: string;
  status?: string;
  date: string;
  relevance: number;
}

const AdvancedSearch: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    status: '',
    dateFrom: '',
    dateTo: '',
    priority: '',
    caseType: '',
    clientType: '',
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const performSearch = async () => {
    if (!user?.id || !filters.query.trim()) return;

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search in cases
      if (filters.type === 'all' || filters.type === 'cases') {
        let casesQuery = supabase
          .from('cases')
          .select(`
            id, title, case_number, status, priority, case_type, created_at,
            client:clients(first_name, last_name, company_name)
          `)
          .eq('firm_id', user.id)
          .or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,case_number.ilike.%${filters.query}%,case_type.ilike.%${filters.query}%`);

        if (filters.status) casesQuery = casesQuery.eq('status', filters.status);
        if (filters.priority) casesQuery = casesQuery.eq('priority', filters.priority);
        if (filters.caseType) casesQuery = casesQuery.ilike('case_type', `%${filters.caseType}%`);
        if (filters.dateFrom) casesQuery = casesQuery.gte('created_at', filters.dateFrom);
        if (filters.dateTo) casesQuery = casesQuery.lte('created_at', filters.dateTo + 'T23:59:59');

        const { data: cases } = await casesQuery;
        
        if (cases) {
          cases.forEach(caseItem => {
            const clientName = caseItem.client?.company_name || 
              `${caseItem.client?.first_name} ${caseItem.client?.last_name}`;
            
            searchResults.push({
              id: caseItem.id,
              type: 'case',
              title: caseItem.title,
              subtitle: `${caseItem.case_number} • ${clientName} • ${caseItem.case_type}`,
              status: caseItem.status,
              date: caseItem.created_at,
              relevance: calculateRelevance(filters.query, caseItem.title + ' ' + caseItem.case_number)
            });
          });
        }
      }

      // Search in clients
      if (filters.type === 'all' || filters.type === 'clients') {
        let clientsQuery = supabase
          .from('clients')
          .select('*')
          .eq('firm_id', user.id)
          .or(`first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,company_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`);

        if (filters.clientType) clientsQuery = clientsQuery.eq('client_type', filters.clientType);
        if (filters.dateFrom) clientsQuery = clientsQuery.gte('created_at', filters.dateFrom);
        if (filters.dateTo) clientsQuery = clientsQuery.lte('created_at', filters.dateTo + 'T23:59:59');

        const { data: clients } = await clientsQuery;
        
        if (clients) {
          clients.forEach(client => {
            const name = client.company_name || `${client.first_name} ${client.last_name}`;
            
            searchResults.push({
              id: client.id,
              type: 'client',
              title: name,
              subtitle: `${client.email || ''} • ${client.phone || ''} • ${client.client_type}`,
              date: client.created_at,
              relevance: calculateRelevance(filters.query, name + ' ' + client.email)
            });
          });
        }
      }

      // Search in documents
      if (filters.type === 'all' || filters.type === 'documents') {
        let documentsQuery = supabase
          .from('documents')
          .select(`
            id, file_name, description, file_type, created_at,
            case:cases(title, case_number)
          `)
          .eq('firm_id', user.id)
          .or(`file_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);

        if (filters.dateFrom) documentsQuery = documentsQuery.gte('created_at', filters.dateFrom);
        if (filters.dateTo) documentsQuery = documentsQuery.lte('created_at', filters.dateTo + 'T23:59:59');

        const { data: documents } = await documentsQuery;
        
        if (documents) {
          documents.forEach(doc => {
            searchResults.push({
              id: doc.id,
              type: 'document',
              title: doc.file_name,
              subtitle: `${doc.file_type || ''} • ${doc.case?.case_number || ''} • ${doc.case?.title || ''}`,
              date: doc.created_at,
              relevance: calculateRelevance(filters.query, doc.file_name + ' ' + (doc.description || ''))
            });
          });
        }
      }

      // Sort by relevance and date
      searchResults.sort((a, b) => {
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevance = (query: string, text: string): number => {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower.includes(queryLower)) {
      const index = textLower.indexOf(queryLower);
      // Higher relevance for exact matches at the beginning
      return 100 - index;
    }
    
    // Check for partial word matches
    const queryWords = queryLower.split(' ');
    let matches = 0;
    queryWords.forEach(word => {
      if (word.length > 2 && textLower.includes(word)) {
        matches++;
      }
    });
    
    return (matches / queryWords.length) * 50;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'case': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'client': return <User className="h-4 w-4 text-green-500" />;
      case 'document': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'case': return 'Dossier';
      case 'client': return 'Client';
      case 'document': return 'Document';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <SubscriptionGuard feature="advanced_search">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Recherche Avancée</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main search */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Rechercher dans vos dossiers, clients, documents..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              />
            </div>
            <Button onClick={() => setShowAdvanced(!showAdvanced)} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
            <Button onClick={performSearch} disabled={loading}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={filters.type} onValueChange={(value: any) => setFilters({ ...filters, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tout</SelectItem>
                        <SelectItem value="cases">Dossiers</SelectItem>
                        <SelectItem value="clients">Clients</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous</SelectItem>
                        <SelectItem value="open">Ouvert</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dateFrom">Date début</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateTo">Date fin</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Results */}
          <div>
            {results.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                {results.length} résultat(s) trouvé(s)
              </p>
            )}
            
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {getTypeIcon(result.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{result.title}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {getTypeLabel(result.type)}
                          </span>
                          {result.status && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {result.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{result.subtitle}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(result.date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {results.length === 0 && filters.query && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun résultat trouvé pour "{filters.query}"</p>
                <p className="text-sm">Essayez avec d'autres mots-clés ou modifiez les filtres</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </SubscriptionGuard>
  );
};

export default AdvancedSearch;
