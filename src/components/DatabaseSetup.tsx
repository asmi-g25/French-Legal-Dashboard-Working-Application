import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  checkDatabaseSetup, 
  checkAllTables, 
  generateSetupSQL,
  testDatabaseConnections,
  TableStatus 
} from '@/utils/databaseSetup';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';

const DatabaseSetup = () => {
  const { toast } = useToast();
  const [setupStatus, setSetupStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);
  const [connectionTests, setConnectionTests] = useState<{[key: string]: boolean}>({});
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setIsChecking(true);
    
    try {
      // Check basic database setup
      const setupResult = await checkDatabaseSetup();
      
      if (setupResult.success) {
        setSetupStatus('success');
        
        // Get detailed table information
        const tables = await checkAllTables();
        setTableStatuses(tables);
        
        // Test connections to all tables
        const connections = await testDatabaseConnections();
        setConnectionTests(connections);
      } else {
        setSetupStatus('error');
        setErrorDetails(setupResult.error || 'Unknown error');
        
        // Still try to get table info for diagnostic purposes
        try {
          const tables = await checkAllTables();
          setTableStatuses(tables);
        } catch (e) {
          console.log('Could not check table statuses');
        }
      }
    } catch (error: any) {
      setSetupStatus('error');
      setErrorDetails(error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié!",
      description: "Le SQL a été copié dans le presse-papiers",
    });
  };

  const missingTables = tableStatuses.filter(table => !table.exists);
  const existingTables = tableStatuses.filter(table => table.exists);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span>Configuration de la Base de Données</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkSetup}
              disabled={isChecking}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Vérifier
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {setupStatus === 'loading' || isChecking ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-slate-600">Vérification de la base de données...</p>
              </div>
            </div>
          ) : setupStatus === 'success' ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ La base de données est correctement configurée et fonctionnelle !
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                ❌ Problème de configuration détecté: {errorDetails}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="status" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Statut des Tables</TabsTrigger>
              <TabsTrigger value="setup">Configuration</TabsTrigger>
              <TabsTrigger value="sql">SQL à Exécuter</TabsTrigger>
              <TabsTrigger value="help">Aide</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="grid gap-4">
                {missingTables.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 mb-3">Tables Manquantes ({missingTables.length})</h3>
                    <div className="grid gap-2">
                      {missingTables.map((table) => (
                        <div key={table.name} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="font-medium">{table.name}</span>
                          </div>
                          <Badge variant="destructive">Manquante</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {existingTables.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 mb-3">Tables Existantes ({existingTables.length})</h3>
                    <div className="grid gap-2">
                      {existingTables.map((table) => (
                        <div key={table.name} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{table.name}</span>
                            <span className="text-sm text-slate-600">({table.recordCount} enregistrements)</span>
                          </div>
                          <Badge variant="default" className="bg-green-100 text-green-800">Configurée</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="setup" className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Pour configurer votre base de données, vous devez exécuter les migrations SQL dans votre tableau de bord Supabase.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded border">
                  <h3 className="font-semibold mb-2">Étapes de Configuration :</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Ouvrez votre <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">tableau de bord Supabase</a></li>
                    <li>Allez dans votre projet</li>
                    <li>Cliquez sur "SQL Editor" dans la barre latérale</li>
                    <li>Créez une nouvelle requête</li>
                    <li>Copiez et collez le SQL depuis l'onglet "SQL à Exécuter"</li>
                    <li>Exécutez la requête</li>
                    <li>Revenez ici et cliquez sur "Vérifier" pour confirmer</li>
                  </ol>
                </div>

                <Button 
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Supabase Dashboard
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sql" className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Exécutez ce SQL dans l'ordre: d'abord 001_enhanced_schema.sql, puis 002_complete_schema_update.sql
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-slate-900 text-slate-100 p-4 rounded relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateSetupSQL())}
                    className="absolute top-2 right-2 text-slate-300 border-slate-600 hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {generateSetupSQL()}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(`
-- Étape 1: Schema de base
-- Copiez le contenu du fichier supabase/migrations/001_enhanced_schema.sql
-- et exécutez-le dans l'éditeur SQL de Supabase
                    `)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier Étape 1
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(`
-- Étape 2: Mise à jour du schema
-- Copiez le contenu du fichier supabase/migrations/002_complete_schema_update.sql
-- et exécutez-le dans l'éditeur SQL de Supabase
                    `)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier Étape 2
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="help" className="space-y-4">
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Réponse à votre question :</strong> Oui, les vraies applications fonctionnent exactement comme ça ! 
                    C'est l'approche standard pour les applications web modernes.
                  </AlertDescription>
                </Alert>

                <div className="bg-slate-50 p-4 rounded">
                  <h3 className="font-semibold mb-3">Architecture Typique d'une Application Réelle :</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✅ <strong>Base de données relationnelle</strong> (PostgreSQL via Supabase)</li>
                    <li>✅ <strong>Interface utilisateur React</strong> avec composants réutilisables</li>
                    <li>✅ <strong>API REST/GraphQL</strong> pour les opérations CRUD</li>
                    <li>✅ <strong>Authentification et sécurité</strong> (Row Level Security)</li>
                    <li>✅ <strong>Stockage de fichiers</strong> (Supabase Storage)</li>
                    <li>✅ <strong>Intégrations externes</strong> (Email, SMS, Paiements)</li>
                    <li>✅ <strong>Gestion d'état côté client</strong> (React hooks)</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Exemples d'Applications Similaires :</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• <strong>Notion</strong> - Gestion de documents et collaboration</li>
                    <li>• <strong>Salesforce</strong> - CRM avec facturation</li>
                    <li>• <strong>Calendly</strong> - Planification de rendez-vous</li>
                    <li>• <strong>HubSpot</strong> - Marketing et ventes</li>
                    <li>• <strong>Slack</strong> - Communications d'équipe</li>
                  </ul>
                </div>

                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Votre application JURIS utilise exactement les mêmes technologies et architectures que les grandes applications SaaS !
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseSetup;
