import { supabase } from '@/integrations/supabase/client';

// SQL to create all necessary tables
const CREATE_TABLES_SQL = `
-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    id_number VARCHAR(50),
    company_name VARCHAR(255),
    client_type VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cases table  
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    case_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'pending', 'won', 'lost')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    court_name VARCHAR(255),
    judge_name VARCHAR(255),
    opposing_party VARCHAR(255),
    opposing_counsel VARCHAR(255),
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    hourly_rate DECIMAL(10,2),
    estimated_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    issued_date DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_cases_firm_id ON cases(firm_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_firm_id ON invoices(firm_id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can manage their own clients" ON clients
    FOR ALL USING (firm_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can manage their own cases" ON cases
    FOR ALL USING (firm_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can manage their own invoices" ON invoices
    FOR ALL USING (firm_id = auth.uid());
`;

export async function createTablesDirectly() {
  try {
    console.log('Creating database tables...');
    
    // Execute the SQL to create tables
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: CREATE_TABLES_SQL
    });

    if (error) {
      // If the RPC doesn't exist, try direct SQL execution
      console.log('RPC method not available, trying direct execution...');
      
      // Try creating tables one by one using individual queries
      const tables = [
        {
          name: 'clients',
          sql: `
            CREATE TABLE IF NOT EXISTS clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                firm_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                company_name VARCHAR(255),
                client_type VARCHAR(20) DEFAULT 'individual',
                status VARCHAR(20) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'cases',
          sql: `
            CREATE TABLE IF NOT EXISTS cases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                firm_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                case_number VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                case_type VARCHAR(50) NOT NULL,
                status VARCHAR(30) DEFAULT 'open',
                priority VARCHAR(20) DEFAULT 'medium',
                court_name VARCHAR(255),
                judge_name VARCHAR(255),
                start_date DATE,
                expected_end_date DATE,
                hourly_rate DECIMAL(10,2),
                estimated_hours INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        }
      ];

      // Since we can't execute DDL from the client, return instructions
      return {
        success: false,
        error: 'Cannot create tables from client side',
        needsManualSetup: true,
        instructions: CREATE_TABLES_SQL
      };
    }

    console.log('Tables created successfully!');
    return { success: true, data };

  } catch (error) {
    console.error('Error creating tables:', error);
    return { 
      success: false, 
      error: 'Table creation failed', 
      details: error,
      needsManualSetup: true,
      instructions: CREATE_TABLES_SQL
    };
  }
}

export async function checkIfTablesExist() {
  try {
    // Try to query each table to see if it exists
    const checks = await Promise.allSettled([
      supabase.from('clients').select('id').limit(1),
      supabase.from('cases').select('id').limit(1),
      supabase.from('invoices').select('id').limit(1),
    ]);

    const results = {
      clients: checks[0].status === 'fulfilled' && !checks[0].value.error,
      cases: checks[1].status === 'fulfilled' && !checks[1].value.error,
      invoices: checks[2].status === 'fulfilled' && !checks[2].value.error,
    };

    const allExist = Object.values(results).every(exists => exists);

    return {
      success: allExist,
      tables: results,
      missing: Object.entries(results)
        .filter(([_, exists]) => !exists)
        .map(([table, _]) => table)
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to check tables',
      details: error
    };
  }
}
