import { supabase } from '@/integrations/supabase/client';

export class DemoDataService {
  
  async createDemoData(firmId: string, plan: 'basic' | 'premium' | 'enterprise') {
    try {
      console.log(`Creating demo data for firm ${firmId} with plan ${plan}`);
      
      // Check if demo data already exists
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('firm_id', firmId)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        console.log('Demo data already exists, skipping creation');
        return;
      }

      // Create clients based on plan
      const clientsToCreate = this.getClientsForPlan(plan);
      const casesData = this.getCasesForPlan(plan);
      
      // Create clients
      const { data: createdClients, error: clientsError } = await supabase
        .from('clients')
        .insert(
          clientsToCreate.map(client => ({
            ...client,
            firm_id: firmId,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          }))
        )
        .select();

      if (clientsError) {
        console.error('Error creating demo clients:', clientsError);
        return;
      }

      // Create cases
      if (createdClients && createdClients.length > 0) {
        const casesToInsert = casesData.map((caseData, index) => ({
          ...caseData,
          firm_id: firmId,
          client_id: createdClients[index % createdClients.length].id,
          case_number: `DEMO-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
          created_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString()
        }));

        const { error: casesError } = await supabase
          .from('cases')
          .insert(casesToInsert);

        if (casesError) {
          console.error('Error creating demo cases:', casesError);
        }
      }

      // Create some calendar events
      await this.createDemoCalendarEvents(firmId, createdClients);

      // Create some notifications
      await this.createDemoNotifications(firmId);

      console.log('Demo data created successfully');
    } catch (error) {
      console.error('Error creating demo data:', error);
    }
  }

  private getClientsForPlan(plan: string) {
    const baseClients = [
      {
        first_name: 'Marie',
        last_name: 'Diallo',
        email: 'marie.diallo@email.com',
        phone: '+221701234567',
        address: 'Dakar, Sénégal',
        client_type: 'individual' as const,
        status: 'active' as const,
        notes: 'Cliente depuis 2 ans, très satisfaite de nos services.'
      },
      {
        first_name: 'Amadou',
        last_name: 'Ba',
        email: 'amadou.ba@email.com', 
        phone: '+221707654321',
        address: 'Thiès, Sénégal',
        client_type: 'individual' as const,
        status: 'active' as const,
        notes: 'Affaire complexe en cours, suivi attentif nécessaire.'
      },
      {
        first_name: '',
        last_name: '',
        company_name: 'SARL TechAfrique',
        email: 'contact@techafrique.sn',
        phone: '+221338765432',
        address: 'Zone industrielle, Dakar',
        client_type: 'company' as const,
        status: 'active' as const,
        notes: 'Entreprise technologique, contrats réguliers.'
      }
    ];

    if (plan === 'basic') return baseClients.slice(0, 2);
    if (plan === 'premium') return [
      ...baseClients,
      {
        first_name: 'Fatou',
        last_name: 'Sall',
        email: 'fatou.sall@email.com',
        phone: '+221776543210',
        address: 'Saint-Louis, Sénégal',
        client_type: 'individual' as const,
        status: 'active' as const,
        notes: 'Nouvelle cliente, dossier divorce en cours.'
      },
      {
        first_name: '',
        last_name: '',
        company_name: 'Groupe Commercial Sahel',
        email: 'info@sahel-group.sn',
        phone: '+221339876543',
        address: 'Plateau, Dakar',
        client_type: 'company' as const,
        status: 'active' as const,
        notes: 'Grand groupe, plusieurs dossiers en parallèle.'
      }
    ];

    // Enterprise gets all + more
    return [
      ...baseClients,
      {
        first_name: 'Fatou',
        last_name: 'Sall',
        email: 'fatou.sall@email.com',
        phone: '+221776543210',
        address: 'Saint-Louis, Sénégal',
        client_type: 'individual' as const,
        status: 'active' as const,
        notes: 'Nouvelle cliente, dossier divorce en cours.'
      },
      {
        first_name: '',
        last_name: '',
        company_name: 'Groupe Commercial Sahel',
        email: 'info@sahel-group.sn',
        phone: '+221339876543',
        address: 'Plateau, Dakar',
        client_type: 'company' as const,
        status: 'active' as const,
        notes: 'Grand groupe, plusieurs dossiers en parallèle.'
      },
      {
        first_name: 'Moussa',
        last_name: 'Ndiaye',
        email: 'moussa.ndiaye@email.com',
        phone: '+221765432109',
        address: 'Rufisque, Sénégal',
        client_type: 'individual' as const,
        status: 'active' as const,
        notes: 'Affaire immobilière, procédure en cours.'
      }
    ];
  }

  private getCasesForPlan(plan: string) {
    const baseCases = [
      {
        title: 'Divorce par consentement mutuel',
        description: 'Procédure de divorce amiable avec partage des biens',
        case_type: 'Droit de la famille',
        status: 'in_progress' as const,
        priority: 'medium' as const,
        start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 25000
      },
      {
        title: 'Contentieux commercial',
        description: 'Litige avec fournisseur, réclamation de dommages',
        case_type: 'Droit commercial',
        status: 'open' as const,
        priority: 'high' as const,
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 30000
      }
    ];

    if (plan === 'basic') return baseCases.slice(0, 1);
    if (plan === 'premium') return [
      ...baseCases,
      {
        title: 'Constitution SARL',
        description: 'Création société nouvelle activité import-export',
        case_type: 'Droit des sociétés',
        status: 'open' as const,
        priority: 'medium' as const,
        start_date: new Date().toISOString().split('T')[0],
        expected_end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 28000
      }
    ];

    // Enterprise gets all + more
    return [
      ...baseCases,
      {
        title: 'Constitution SARL',
        description: 'Création société nouvelle activité import-export', 
        case_type: 'Droit des sociétés',
        status: 'open' as const,
        priority: 'medium' as const,
        start_date: new Date().toISOString().split('T')[0],
        expected_end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 28000
      },
      {
        title: 'Recouvrement de créances',
        description: 'Procédure de recouvrement amiable puis judiciaire',
        case_type: 'Droit commercial',
        status: 'in_progress' as const,
        priority: 'high' as const,
        start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 32000
      }
    ];
  }

  private async createDemoCalendarEvents(firmId: string, clients: any[]) {
    if (!clients || clients.length === 0) return;

    const events = [
      {
        title: 'Rendez-vous consultation',
        description: 'Première consultation avec nouveau client',
        event_type: 'consultation' as const,
        start_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        location: 'Bureau - Cabinet',
        status: 'scheduled' as const,
        client_id: clients[0].id
      },
      {
        title: 'Audience tribunal',
        description: 'Plaidoirie affaire commerciale',
        event_type: 'hearing' as const,
        start_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        location: 'Tribunal de Grande Instance',
        status: 'scheduled' as const,
        client_id: clients[1] ? clients[1].id : clients[0].id
      }
    ];

    const { error } = await supabase
      .from('calendar_events')
      .insert(
        events.map(event => ({
          ...event,
          firm_id: firmId,
          created_at: new Date().toISOString()
        }))
      );

    if (error) {
      console.error('Error creating demo calendar events:', error);
    }
  }

  private async createDemoNotifications(firmId: string) {
    const notifications = [
      {
        type: 'welcome',
        title: 'Bienvenue !',
        message: 'Bienvenue dans votre espace de gestion juridique. Nous espérons que notre plateforme vous aidera à optimiser la gestion de votre cabinet.',
        channel: 'in_app',
        recipient: 'user',
        status: 'sent'
      },
      {
        type: 'appointment_reminder',
        title: 'Rappel de rendez-vous',
        message: 'N\'oubliez pas votre rendez-vous client prévu demain à 14h30 pour la consultation initiale.',
        channel: 'in_app',
        recipient: 'user',
        status: 'sent'
      }
    ];

    const { error } = await supabase
      .from('notifications')
      .insert(
        notifications.map(notification => ({
          ...notification,
          firm_id: firmId,
          created_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString()
        }))
      );

    if (error) {
      console.error('Error creating demo notifications:', error);
    }
  }
}

export default DemoDataService;
