import { supabase } from '@/integrations/supabase/client';

export interface DatabaseSetupResult {
  success: boolean;
  error?: string;
  details?: string;
}

export interface TableStatus {
  name: string;
  exists: boolean;
  hasData: boolean;
  recordCount: number;
}

// List of all required tables for the application
const REQUIRED_TABLES = [
  'clients',
  'cases', 
  'documents',
  'calendar_events',
  'communications',
  'invoices',
  'professional_contacts',
  'payment_transactions',
  'subscription_payments'
];

export async function checkDatabaseSetup(): Promise<DatabaseSetupResult> {
  try {
    // Try to access the clients table as a basic test
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (error) {
      // Check if it's a table not found error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return {
          success: false,
          error: 'Tables not found',
          details: 'The database tables do not exist. Please run the SQL migrations.'
        };
      }
      
      // Check for permission errors
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        return {
          success: false,
          error: 'Permission denied',
          details: 'Row Level Security policies may not be set up correctly.'
        };
      }
      
      return {
        success: false,
        error: error.message,
        details: 'Database connection or configuration error.'
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown database error',
      details: 'Failed to connect to database or execute query.'
    };
  }
}

export async function checkAllTables(): Promise<TableStatus[]> {
  const tableStatuses: TableStatus[] = [];

  for (const tableName of REQUIRED_TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true });

      if (error) {
        tableStatuses.push({
          name: tableName,
          exists: false,
          hasData: false,
          recordCount: 0
        });
      } else {
        tableStatuses.push({
          name: tableName,
          exists: true,
          hasData: (count || 0) > 0,
          recordCount: count || 0
        });
      }
    } catch (error) {
      tableStatuses.push({
        name: tableName,
        exists: false,
        hasData: false,
        recordCount: 0
      });
    }
  }

  return tableStatuses;
}

export async function createMissingTables(): Promise<DatabaseSetupResult> {
  try {
    // This would execute the SQL migration - in a real app you'd have a migration system
    // For now, we'll return instructions for manual setup
    return {
      success: false,
      error: 'Manual setup required',
      details: 'Please execute the SQL migration files in your Supabase dashboard.'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: 'Failed to create tables automatically.'
    };
  }
}

export function generateSetupSQL(): string {
  return `
-- Run this SQL in your Supabase SQL Editor to set up all required tables

-- First, run the base schema (001_enhanced_schema.sql)
-- Then run the updated schema (002_complete_schema_update.sql)

-- You can find these files in the supabase/migrations/ folder

-- Basic check query to verify setup:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'clients', 'cases', 'documents', 'calendar_events', 
  'communications', 'invoices', 'professional_contacts',
  'payment_transactions', 'subscription_payments'
);
  `;
}

export async function testDatabaseConnections(): Promise<{[key: string]: boolean}> {
  const results: {[key: string]: boolean} = {};

  for (const tableName of REQUIRED_TABLES) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      results[tableName] = !error;
    } catch (error) {
      results[tableName] = false;
    }
  }

  return results;
}
