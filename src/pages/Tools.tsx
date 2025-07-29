import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AdvancedSearch from '@/components/AdvancedSearch';
import TimeTracker from '@/components/TimeTracker';
import DataExport from '@/components/DataExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Timer, Download, BarChart3, Crown, Shield } from 'lucide-react';

const Tools = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-amber-50 rounded-lg p-6 border border-slate-200">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Outils Avancés
          </h1>
          <p className="text-slate-600">
            Fonctionnalités premium pour optimiser votre productivité et l'efficacité de votre cabinet.
          </p>
        </div>

        {/* Premium Tools Tabs */}
        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Recherche</span>
              <Crown className="h-3 w-3 text-amber-500" />
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center space-x-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Temps</span>
              <Crown className="h-3 w-3 text-amber-500" />
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              <Crown className="h-3 w-3 text-amber-500" />
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <Shield className="h-3 w-3 text-purple-500" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search">
            <AdvancedSearch />
          </TabsContent>

          <TabsContent value="time">
            <TimeTracker />
          </TabsContent>

          <TabsContent value="export">
            <DataExport />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-16">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-purple-500 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Analyses Avancées</h3>
              <p className="text-gray-600 mb-4">
                Tableaux de bord personnalisables et rapports détaillés pour optimiser votre cabinet.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center space-x-2 text-purple-700">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Fonctionnalité Enterprise</span>
                </div>
                <p className="text-sm text-purple-600 mt-2">
                  Cette fonctionnalité sera disponible prochainement pour les utilisateurs Enterprise.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Tools;
