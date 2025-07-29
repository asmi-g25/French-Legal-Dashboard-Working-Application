import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { checkDatabaseSetup, testDatabaseConnection } from '@/utils/databaseSetup';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const DatabaseStatus = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState({
    connection: 'checking',
    tables: 'checking',
    details: null as any,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      // Test connection
      const connectionTest = await testDatabaseConnection();
      
      // Test tables
      const tablesTest = await checkDatabaseSetup();
      
      setStatus({
        connection: connectionTest.success ? 'success' : 'error',
        tables: tablesTest.success ? 'success' : 'error',
        details: {
          connection: connectionTest,
          tables: tablesTest,
        },
      });

    } catch (error) {
      console.error('Status check failed:', error);
      setStatus({
        connection: 'error',
        tables: 'error',
        details: { error },
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statusType: string) => {
    switch (statusType) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (statusType: string) => {
    switch (statusType) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Connecté</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Erreur</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800">Vérification...</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Inconnu</Badge>;
    }
  };

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Statut de la Base de Données</span>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status.connection)}
            <div>
              <p className="font-medium">Connexion Supabase</p>
              <p className="text-sm text-slate-600">Authentification et API</p>
            </div>
          </div>
          {getStatusBadge(status.connection)}
        </div>

        {/* Tables Status */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status.tables)}
            <div>
              <p className="font-medium">Tables de la Base</p>
              <p className="text-sm text-slate-600">Clients, Cases, Profiles</p>
            </div>
          </div>
          {getStatusBadge(status.tables)}
        </div>

        {/* Error Details */}
        {(status.connection === 'error' || status.tables === 'error') && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              <strong>Problème détecté:</strong>
              <br />
              {status.details?.tables?.error && (
                <span>Tables: {status.details.tables.error}<br /></span>
              )}
              {status.details?.connection?.error && (
                <span>Connexion: {status.details.connection.error}<br /></span>
              )}
              <br />
              <strong>Solution:</strong> Vous devez exécuter la migration SQL dans votre tableau de bord Supabase pour créer les tables nécessaires.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {status.connection === 'success' && status.tables === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              <strong>Tout fonctionne parfaitement!</strong>
              <br />
              Votre base de données est correctement configurée et toutes les tables sont accessibles.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {status.tables === 'error' && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-800">Instructions de Configuration:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Ouvrez votre tableau de bord Supabase</li>
              <li>Allez dans l'onglet "SQL Editor"</li>
              <li>Copiez et exécutez le contenu du fichier <code>supabase/migrations/001_enhanced_schema.sql</code></li>
              <li>Actualisez cette page pour vérifier</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseStatus;
