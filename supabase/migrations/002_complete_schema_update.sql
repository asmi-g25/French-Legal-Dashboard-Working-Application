-- Complete Database Schema Update for Law Firm Management
-- This migration adds missing tables and updates existing ones to match the application

-- Update documents table to match application expectations
ALTER TABLE documents 
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS file_path,
DROP COLUMN IF EXISTS version,
DROP COLUMN IF EXISTS is_template,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS confidentiality_level;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived'));

-- Update calendar_events table to match application expectations  
ALTER TABLE calendar_events
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS is_all_day,
DROP COLUMN IF EXISTS attendees;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false;

-- Update communications table structure
ALTER TABLE communications
ALTER COLUMN client_id DROP NOT NULL,
ALTER COLUMN case_id DROP NOT NULL;

-- Update invoices table to match application expectations
ALTER TABLE invoices
DROP COLUMN IF EXISTS subtotal,
DROP COLUMN IF EXISTS tax_rate,
DROP COLUMN IF EXISTS tax_amount,
DROP COLUMN IF EXISTS issued_date,
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS payment_reference,
DROP COLUMN IF EXISTS notes;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_excluding_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;

-- Create professional_contacts table (this was missing)
CREATE TABLE IF NOT EXISTS professional_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('lawyer', 'accountant', 'medical_expert', 'bailiff', 'other')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    title VARCHAR(100),
    speciality VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    notes TEXT,
    last_contact_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_professional_contacts_firm_id ON professional_contacts(firm_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_firm_id ON calendar_events(firm_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_datetime ON calendar_events(start_datetime);

-- Add RLS policies for new table
ALTER TABLE professional_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firms can manage their own professional contacts" ON professional_contacts FOR ALL USING (firm_id = auth.uid());

-- Add update trigger for professional_contacts
CREATE TRIGGER update_professional_contacts_updated_at 
    BEFORE UPDATE ON professional_contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fix any data type mismatches
ALTER TABLE documents ALTER COLUMN file_size TYPE BIGINT;

-- Update calendar event type constraints
ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;

ALTER TABLE calendar_events 
ADD CONSTRAINT calendar_events_event_type_check 
CHECK (event_type IN ('hearing', 'consultation', 'meeting', 'deadline', 'other'));

-- Update calendar status constraints  
ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_status_check;

ALTER TABLE calendar_events 
ADD CONSTRAINT calendar_events_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled'));

-- Update communication status constraints
ALTER TABLE communications 
DROP CONSTRAINT IF EXISTS communications_status_check;

ALTER TABLE communications 
ADD CONSTRAINT communications_status_check 
CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read'));

-- Update communication type constraints
ALTER TABLE communications 
DROP CONSTRAINT IF EXISTS communications_type_check;

ALTER TABLE communications 
ADD CONSTRAINT communications_type_check 
CHECK (type IN ('email', 'sms', 'whatsapp', 'phone'));

-- Update invoice status constraints
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- Ensure currency column exists and has correct default
ALTER TABLE invoices 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- Add any missing columns to match application expectations
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing documents to set firm_id based on case
UPDATE documents 
SET firm_id = cases.firm_id 
FROM cases 
WHERE documents.case_id = cases.id AND documents.firm_id IS NULL;
