import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import DemoDataService from '@/services/demoDataService';

interface UserProfile {
  id: string;
  email: string;
  firmName: string;
  phone: string;
  subscription?: {
    status: 'active' | 'inactive';
    plan: 'basic' | 'premium' | 'enterprise';
    expiresAt: string;
    startedAt: string;
  };
  planLimits?: {
    maxCases: number | 'unlimited';
    maxClients: number | 'unlimited';
    maxDocuments: number | 'unlimited';
    maxUsers: number | 'unlimited';
    features: string[];
  };
  usage?: {
    cases: number;
    clients: number;
    documents: number;
    users: number;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  upgradePlan: (newPlan: 'basic' | 'premium' | 'enterprise') => Promise<boolean>;
  loading: boolean;
  isSubscribed: boolean;
  hasFeature: (feature: string) => boolean;
  getPlanLimits: () => UserProfile['planLimits'];
  canPerformAction: (action: string) => { allowed: boolean; reason?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getPlanConfiguration = (plan: 'basic' | 'premium' | 'enterprise') => {
  const configs = {
    basic: {
      maxCases: 10,
      maxClients: 25,
      maxDocuments: 50,
      maxUsers: 1,
      features: [
        'basic_case_management',
        'basic_client_management', 
        'basic_calendar',
        'basic_documents',
        'email_support'
      ]
    },
    premium: {
      maxCases: 500,
      maxClients: 1000,
      maxDocuments: 5000,
      maxUsers: 5,
      features: [
        'basic_case_management',
        'basic_client_management',
        'basic_calendar',
        'basic_documents',
        'advanced_case_management',
        'advanced_client_management',
        'advanced_calendar',
        'advanced_documents',
        'document_automation',
        'whatsapp_notifications',
        'email_notifications',
        'priority_support',
        'billing_management',
        'advanced_search',
        'case_templates',
        'client_portal',
        'time_tracking',
        'invoice_generation'
      ]
    },
    enterprise: {
      maxCases: 'unlimited' as const,
      maxClients: 'unlimited' as const,
      maxDocuments: 'unlimited' as const,
      maxUsers: 'unlimited' as const,
      features: [
        'basic_case_management',
        'basic_client_management',
        'basic_calendar',
        'basic_documents',
        'advanced_case_management',
        'advanced_client_management',
        'advanced_calendar',
        'advanced_documents',
        'document_automation',
        'whatsapp_notifications',
        'email_notifications',
        'priority_support',
        'billing_management',
        'advanced_search',
        'case_templates',
        'client_portal',
        'time_tracking',
        'invoice_generation',
        'multi_user_management',
        'advanced_reporting',
        'api_access',
        'custom_integrations',
        'dedicated_support',
        'advanced_security',
        'audit_logs',
        'white_labeling',
        'custom_workflows',
        'bulk_operations',
        'advanced_analytics',
        'compliance_tools'
      ]
    }
  };
  return configs[plan];
};

// Get real usage data from database
const getRealUsage = async (firmId: string) => {
  try {
    const [casesResult, clientsResult, documentsResult] = await Promise.all([
      supabase.from('cases').select('id', { count: 'exact' }).eq('firm_id', firmId),
      supabase.from('clients').select('id', { count: 'exact' }).eq('firm_id', firmId),
      supabase.from('documents').select('id', { count: 'exact' }).eq('firm_id', firmId),
    ]);

    return {
      cases: casesResult.count || 0,
      clients: clientsResult.count || 0,
      documents: documentsResult.count || 0,
      users: 1, // For now, single user per firm
    };
  } catch (error) {
    console.error('Error fetching real usage data:', error);
    return { cases: 0, clients: 0, documents: 0, users: 1 };
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to defer the profile loading and prevent blocking
          setTimeout(() => {
            loadUserProfile(session.user);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      console.log('Loading profile for user:', authUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (profile) {
        const planConfig = profile.subscription_status === 'active' ? 
          getPlanConfiguration(profile.subscription_plan as 'basic' | 'premium' | 'enterprise') : 
          undefined;

        // Get real usage data
        const realUsage = await getRealUsage(profile.id);

        const userProfile: UserProfile = {
          id: profile.id,
          email: authUser.email!,
          firmName: profile.firm_name,
          phone: profile.phone || '',
          subscription: profile.subscription_status === 'active' ? {
            status: profile.subscription_status as 'active',
            plan: profile.subscription_plan as 'basic' | 'premium' | 'enterprise',
            expiresAt: profile.subscription_expires_at,
            startedAt: profile.subscription_started_at
          } : undefined,
          planLimits: planConfig,
          usage: profile.subscription_status === 'active' ? realUsage : undefined
        };

        console.log('User profile loaded:', userProfile);
        setUser(userProfile);

        // Create demo data for demo accounts
        const isDemoAccount = ['demo@cabinet.com', 'basic@cabinet.com', 'enterprise@cabinet.com'].includes(authUser.email || '');
        if (isDemoAccount && profile.subscription_status === 'active') {
          const demoService = new DemoDataService();
          await demoService.createDemoData(profile.id, profile.subscription_plan as 'basic' | 'premium' | 'enterprise');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Connexion réussie",
        description: `Bienvenue !`,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erreur de connexion",
        description: error.message || 'Une erreur est survenue',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            firm_name: data.firmName,
            phone: data.phone
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre compte.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message || 'Une erreur est survenue',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      toast({
        title: "Déconnexion",
        description: "À bientôt !",
      });
    }
  };

  const upgradePlan = async (newPlan: 'basic' | 'premium' | 'enterprise'): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: newPlan,
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_started_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      const planConfig = getPlanConfiguration(newPlan);
      const realUsage = await getRealUsage(user.id);
      const updatedUser = {
        ...user,
        subscription: {
          status: 'active' as const,
          plan: newPlan,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          startedAt: new Date().toISOString()
        },
        planLimits: planConfig,
        usage: realUsage
      };
      setUser(updatedUser);

      toast({
        title: "Plan mis à jour!",
        description: `Votre plan ${newPlan} est maintenant actif.`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur de mise à jour",
        description: "Impossible de mettre à jour le plan",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (feature: string) => {
    if (!user?.planLimits?.features) return false;
    return user.planLimits.features.includes(feature);
  };

  const canPerformAction = (action: string) => {
    if (!user?.planLimits || !user.usage) {
      return { allowed: false, reason: "Aucun abonnement actif" };
    }

    const { planLimits, usage } = user;

    switch (action) {
      case 'create_case':
        if (planLimits.maxCases === 'unlimited') return { allowed: true };
        if (usage.cases >= planLimits.maxCases) {
          return { allowed: false, reason: `Limite de ${planLimits.maxCases} dossiers atteinte` };
        }
        return { allowed: true };
      
      case 'add_client':
        if (planLimits.maxClients === 'unlimited') return { allowed: true };
        if (usage.clients >= planLimits.maxClients) {
          return { allowed: false, reason: `Limite de ${planLimits.maxClients} clients atteinte` };
        }
        return { allowed: true };
      
      case 'upload_document':
        if (planLimits.maxDocuments === 'unlimited') return { allowed: true };
        if (usage.documents >= planLimits.maxDocuments) {
          return { allowed: false, reason: `Limite de ${planLimits.maxDocuments} documents atteinte` };
        }
        return { allowed: true };
      
      default:
        return { allowed: true };
    }
  };

  const getPlanLimits = () => user?.planLimits;
  const isSubscribed = user?.subscription?.status === 'active';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      register,
      logout,
      upgradePlan,
      loading,
      isSubscribed,
      hasFeature,
      getPlanLimits,
      canPerformAction
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
