import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SubscriptionGuard, { useSubscriptionGuard } from '@/components/SubscriptionGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
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
import { Search, Upload, FileText, Download, Eye, Folder, Plus, Edit, Trash2, Crown } from 'lucide-react';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: string;
  description: string | null;
  uploaded_by: string;
  case_id: string | null;
  case_title?: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
}

interface DocumentStats {
  totalDocuments: number;
  activeCases: number;
  uploadsThisMonth: number;
  totalViews: number;
}

const Documents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAccess } = useSubscriptionGuard();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats>({
    totalDocuments: 0,
    activeCases: 0,
    uploadsThisMonth: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cases, setCases] = useState<Array<{id: string, title: string}>>([]);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: '',
    description: '',
    case_id: '',
    status: 'draft' as 'draft' | 'review' | 'approved' | 'archived',
  });

  useEffect(() => {
    if (user?.id) {
      loadDocuments();
      loadCases();
      loadStats();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          cases(title)
        `)
        .eq('firm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const documentsWithCases = data?.map(doc => ({
        ...doc,
        case_title: doc.cases?.title || null,
      })) || [];

      setDocuments(documentsWithCases);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les documents: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, title')
        .eq('firm_id', user.id)
        .eq('status', 'open')
        .order('title');

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      // Get total documents count
      const { count: totalDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id);

      // Get active cases count  
      const { count: activeCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .in('status', ['open', 'in_progress']);

      // Get uploads this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: uploadsThisMonth } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalDocuments: totalDocuments || 0,
        activeCases: activeCases || 0,
        uploadsThisMonth: uploadsThisMonth || 0,
        totalViews: 0, // Would need a separate views tracking table
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadForm.file || !user?.id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier",
        variant: "destructive",
      });
      return;
    }

    // Check subscription limits before uploading
    const canUpload = await checkAccess('upload_document');
    if (!canUpload) {
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de documents pour votre plan. Mettez à niveau pour en ajouter davantage.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          firm_id: user.id,
          case_id: uploadForm.case_id || null,
          file_name: uploadForm.file.name,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          file_url: publicUrl,
          storage_path: filePath,
          category: uploadForm.category,
          description: uploadForm.description || null,
          uploaded_by: user.email || 'Utilisateur',
          status: uploadForm.status,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Document téléchargé avec succès",
      });

      setIsUploadModalOpen(false);
      setUploadForm({
        file: null,
        category: '',
        description: '',
        case_id: '',
        status: 'draft',
      });
      loadDocuments();
      loadStats();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur",
        description: `Erreur lors du téléchargement: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (document: Document) => {
    window.open(document.file_url, '_blank');
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Document supprimé avec succès",
      });

      loadDocuments();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    if (type.includes('pdf')) return 'bg-red-100 text-red-800';
    if (type.includes('word') || type.includes('document')) return 'bg-blue-100 text-blue-800';
    if (type.includes('sheet') || type.includes('excel')) return 'bg-green-100 text-green-800';
    if (type.includes('image')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'review': return 'En révision';
      case 'draft': return 'Brouillon';
      case 'archived': return 'Archivé';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    searchTerm === '' ||
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.case_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Chargement des documents..." className="h-64" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Gestion des Documents
          </h1>
          <SubscriptionGuard action="upload_document" showUpgradePrompt={false}>
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg">
                <Upload className="h-4 w-4 mr-2" />
                Télécharger Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Télécharger un nouveau document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Fichier *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select value={uploadForm.category} onValueChange={(value) => setUploadForm({...uploadForm, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contrat">Contrat</SelectItem>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="testament">Testament</SelectItem>
                      <SelectItem value="pieces_jointes">Pièces jointes</SelectItem>
                      <SelectItem value="correspondance">Correspondance</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="case_id">Dossier</Label>
                  <Select value={uploadForm.case_id} onValueChange={(value) => setUploadForm({...uploadForm, case_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Associer à un dossier (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={uploadForm.status} onValueChange={(value: any) => setUploadForm({...uploadForm, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="review">En révision</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    placeholder="Description du document..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleFileUpload} disabled={isUploading} className="flex-1">
                    {isUploading ? 'Téléchargement...' : 'Télécharger'}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </SubscriptionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{stats.totalDocuments}</p>
                  <p className="text-sm text-blue-600">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Folder className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">{stats.activeCases}</p>
                  <p className="text-sm text-green-600">Dossiers Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <Upload className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-800">{stats.uploadsThisMonth}</p>
                  <p className="text-sm text-orange-600">Uploads ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-lg p-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-800">{filteredDocuments.length}</p>
                  <p className="text-sm text-purple-600">Documents visibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-amber-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {documents.length === 0 ? 'Aucun document' : 'Aucun résultat'}
                </h3>
                <p className="text-slate-500">
                  {documents.length === 0 
                    ? 'Commencez par télécharger votre premier document'
                    : 'Aucun document ne correspond à votre recherche'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Document</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Dossier</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Taille</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Téléchargé par</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-100 hover:bg-amber-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="font-medium text-slate-900">{doc.file_name}</p>
                              <p className="text-sm text-slate-500 capitalize">{doc.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getTypeColor(doc.file_type)}>
                            {doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {doc.case_title || 'Non associé'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{doc.uploaded_by}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(doc.status)}>
                            {getStatusLabel(doc.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownload(doc)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Documents;
