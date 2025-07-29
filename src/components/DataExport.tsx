import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Table, Crown, Calendar, Users, FileType } from 'lucide-react';

interface ExportConfig {
  type: 'cases' | 'clients' | 'documents' | 'time_entries' | 'invoices';
  format: 'pdf' | 'excel' | 'csv';
  dateFrom: string;
  dateTo: string;
  includeFields: string[];
  status?: string;
}

const DataExport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<ExportConfig>({
    type: 'cases',
    format: 'excel',
    dateFrom: '',
    dateTo: '',
    includeFields: [],
    status: '',
  });
  const [loading, setLoading] = useState(false);

  const exportTypes = [
    { value: 'cases', label: 'Dossiers juridiques', icon: <FileText className="h-4 w-4" /> },
    { value: 'clients', label: 'Fiches clients', icon: <Users className="h-4 w-4" /> },
    { value: 'documents', label: 'Documents', icon: <FileType className="h-4 w-4" /> },
    { value: 'time_entries', label: 'Suivi du temps', icon: <Calendar className="h-4 w-4" /> },
    { value: 'invoices', label: 'Factures', icon: <Table className="h-4 w-4" /> },
  ];

  const formatTypes = [
    { value: 'excel', label: 'Excel (.xlsx)', description: 'Format compatible avec Microsoft Excel' },
    { value: 'csv', label: 'CSV (.csv)', description: 'Format texte séparé par virgules' },
    { value: 'pdf', label: 'PDF (.pdf)', description: 'Document PDF formaté' },
  ];

  const getAvailableFields = () => {
    switch (config.type) {
      case 'cases':
        return [
          { id: 'case_number', label: 'Numéro de dossier' },
          { id: 'title', label: 'Titre' },
          { id: 'description', label: 'Description' },
          { id: 'case_type', label: 'Type de dossier' },
          { id: 'status', label: 'Statut' },
          { id: 'priority', label: 'Priorité' },
          { id: 'client_name', label: 'Nom du client' },
          { id: 'start_date', label: 'Date de début' },
          { id: 'expected_end_date', label: 'Date de fin prévue' },
          { id: 'hourly_rate', label: 'Taux horaire' },
          { id: 'court_name', label: 'Tribunal' },
          { id: 'judge_name', label: 'Juge' },
          { id: 'opposing_party', label: 'Partie adverse' },
          { id: 'created_at', label: 'Date de création' },
        ];
      case 'clients':
        return [
          { id: 'first_name', label: 'Prénom' },
          { id: 'last_name', label: 'Nom' },
          { id: 'company_name', label: 'Nom de société' },
          { id: 'email', label: 'Email' },
          { id: 'phone', label: 'Téléphone' },
          { id: 'address', label: 'Adresse' },
          { id: 'client_type', label: 'Type de client' },
          { id: 'status', label: 'Statut' },
          { id: 'notes', label: 'Notes' },
          { id: 'created_at', label: 'Date de création' },
        ];
      case 'documents':
        return [
          { id: 'file_name', label: 'Nom du fichier' },
          { id: 'description', label: 'Description' },
          { id: 'file_type', label: 'Type de fichier' },
          { id: 'file_size', label: 'Taille' },
          { id: 'case_title', label: 'Dossier associé' },
          { id: 'uploaded_by', label: 'Téléchargé par' },
          { id: 'created_at', label: 'Date de création' },
        ];
      case 'time_entries':
        return [
          { id: 'description', label: 'Description' },
          { id: 'case_title', label: 'Dossier' },
          { id: 'start_time', label: 'Heure de début' },
          { id: 'end_time', label: 'Heure de fin' },
          { id: 'duration_minutes', label: 'Durée (minutes)' },
          { id: 'hourly_rate', label: 'Taux horaire' },
          { id: 'billable_amount', label: 'Montant facturable' },
          { id: 'is_billable', label: 'Facturable' },
          { id: 'created_at', label: 'Date' },
        ];
      case 'invoices':
        return [
          { id: 'invoice_number', label: 'Numéro de facture' },
          { id: 'client_name', label: 'Client' },
          { id: 'description', label: 'Description' },
          { id: 'total_amount', label: 'Montant total' },
          { id: 'status', label: 'Statut' },
          { id: 'invoice_date', label: 'Date de facture' },
          { id: 'due_date', label: 'Date d\'échéance' },
          { id: 'paid_date', label: 'Date de paiement' },
        ];
      default:
        return [];
    }
  };

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    if (checked) {
      setConfig(prev => ({
        ...prev,
        includeFields: [...prev.includeFields, fieldId]
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        includeFields: prev.includeFields.filter(id => id !== fieldId)
      }));
    }
  };

  const exportData = async () => {
    if (!user?.id) return;
    
    if (config.includeFields.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un champ à exporter",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let query = supabase.from(config.type);
      let selectFields = '';

      // Build select fields based on type
      switch (config.type) {
        case 'cases':
          selectFields = `
            ${config.includeFields.join(', ')},
            client:clients(first_name, last_name, company_name)
          `;
          break;
        case 'clients':
          selectFields = config.includeFields.join(', ');
          break;
        case 'documents':
          selectFields = `
            ${config.includeFields.join(', ')},
            case:cases(title, case_number)
          `;
          break;
        case 'time_entries':
          selectFields = `
            ${config.includeFields.join(', ')},
            case:cases(title, case_number)
          `;
          break;
        case 'invoices':
          selectFields = `
            ${config.includeFields.join(', ')},
            client:clients(first_name, last_name, company_name)
          `;
          break;
      }

      const { data, error } = await query
        .select(selectFields)
        .eq('firm_id', user.id)
        .gte('created_at', config.dateFrom || '1900-01-01')
        .lte('created_at', config.dateTo ? config.dateTo + 'T23:59:59' : '2100-12-31');

      if (error) throw error;

      // Process and format data based on export format
      const formattedData = formatDataForExport(data);

      // Generate and download file
      await generateFile(formattedData);

      toast({
        title: "Succès",
        description: `Export ${config.format.toUpperCase()} généré avec succès`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'export",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDataForExport = (data: any[]) => {
    return data.map(item => {
      const formatted: any = {};
      
      config.includeFields.forEach(field => {
        switch (field) {
          case 'client_name':
            if (item.client) {
              formatted[field] = item.client.company_name || 
                `${item.client.first_name} ${item.client.last_name}`;
            }
            break;
          case 'case_title':
            if (item.case) {
              formatted[field] = `${item.case.case_number} - ${item.case.title}`;
            }
            break;
          case 'duration_minutes':
            formatted[field] = item[field] ? `${Math.floor(item[field] / 60)}h ${item[field] % 60}min` : '';
            break;
          case 'file_size':
            formatted[field] = item[field] ? `${(item[field] / 1024 / 1024).toFixed(2)} MB` : '';
            break;
          case 'is_billable':
            formatted[field] = item[field] ? 'Oui' : 'Non';
            break;
          case 'created_at':
          case 'start_time':
          case 'end_time':
          case 'invoice_date':
          case 'due_date':
          case 'paid_date':
            formatted[field] = item[field] ? new Date(item[field]).toLocaleDateString('fr-FR') : '';
            break;
          default:
            formatted[field] = item[field] || '';
        }
      });
      
      return formatted;
    });
  };

  const generateFile = async (data: any[]) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${config.type}_export_${timestamp}`;

    if (config.format === 'csv') {
      generateCSV(data, filename);
    } else if (config.format === 'excel') {
      // For demo purposes, we'll generate CSV (in real app you'd use a library like xlsx)
      generateCSV(data, filename);
      toast({
        title: "Info",
        description: "Export généré en format CSV (Excel sera disponible prochainement)",
      });
    } else if (config.format === 'pdf') {
      generatePDF(data, filename);
    }
  };

  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const generatePDF = (data: any[], filename: string) => {
    // Simple PDF generation (in real app you'd use jsPDF or similar)
    const content = data.map(item => 
      Object.entries(item).map(([key, value]) => `${key}: ${value}`).join('\n')
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.txt`;
    link.click();

    toast({
      title: "Info",
      description: "Export généré en format texte (PDF formaté sera disponible prochainement)",
    });
  };

  return (
    <SubscriptionGuard feature="data_export">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export de Données</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Type Selection */}
          <div>
            <Label>Type de données à exporter</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {exportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConfig(prev => ({ ...prev, type: type.value as any, includeFields: [] }))}
                  className={`p-3 border rounded-lg flex items-center space-x-2 hover:bg-gray-50 ${
                    config.type === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {type.icon}
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <Label>Format d'export</Label>
            <Select value={config.format} onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatTypes.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    <div>
                      <p className="font-medium">{format.label}</p>
                      <p className="text-xs text-gray-500">{format.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date de début</Label>
              <Input
                type="date"
                value={config.dateFrom}
                onChange={(e) => setConfig(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date de fin</Label>
              <Input
                type="date"
                value={config.dateTo}
                onChange={(e) => setConfig(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <Label>Champs à inclure</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
              {getAvailableFields().map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={config.includeFields.includes(field.id)}
                    onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                  />
                  <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                </div>
              ))}
            </div>
            {config.includeFields.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                Sélectionnez au moins un champ à exporter
              </p>
            )}
          </div>

          {/* Export Button */}
          <Button 
            onClick={exportData} 
            disabled={loading || config.includeFields.length === 0}
            className="w-full"
          >
            {loading ? (
              'Export en cours...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter {config.includeFields.length} champ(s) en {config.format.toUpperCase()}
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Informations sur l'export</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Les exports incluent uniquement vos données personnelles</li>
              <li>• Les fichiers sont générés localement pour votre sécurité</li>
              <li>• Compatible avec Excel, Google Sheets et autres tableurs</li>
              <li>• Idéal pour rapports, analyses et archivage</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </SubscriptionGuard>
  );
};

export default DataExport;
