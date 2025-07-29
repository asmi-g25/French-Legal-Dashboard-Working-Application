-- SQL script to set up demo user profiles with proper subscriptions
-- Run this in your Supabase SQL editor after the migrations

-- Basic plan demo user
INSERT INTO profiles (
    id, 
    firm_name, 
    email, 
    phone, 
    subscription_plan, 
    subscription_status, 
    subscription_started_at, 
    subscription_expires_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Cabinet Martin & Associés',
    'basic@cabinet.com',
    '+221701234567',
    'basic',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    subscription_plan = 'basic',
    subscription_status = 'active',
    subscription_started_at = NOW(),
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Premium plan demo user  
INSERT INTO profiles (
    id,
    firm_name,
    email,
    phone,
    subscription_plan,
    subscription_status, 
    subscription_started_at,
    subscription_expires_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002', 
    'SCP Diallo & Partners',
    'demo@cabinet.com',
    '+221707654321',
    'premium',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    subscription_plan = 'premium',
    subscription_status = 'active', 
    subscription_started_at = NOW(),
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Enterprise plan demo user
INSERT INTO profiles (
    id,
    firm_name, 
    email,
    phone,
    subscription_plan,
    subscription_status,
    subscription_started_at,
    subscription_expires_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Groupe Juridique Sahel',
    'enterprise@cabinet.com', 
    '+221776543210',
    'enterprise',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    subscription_started_at = NOW(), 
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Add payment records for demo users to show payment history
INSERT INTO subscription_payments (
    firm_id,
    plan_name,
    amount,
    currency,
    billing_period,
    period_start,
    period_end, 
    status,
    paid_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'basic',
    15000,
    'FCFA',
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW()
),
(
    '00000000-0000-0000-0000-000000000002',
    'premium', 
    35000,
    'FCFA',
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW()
),
(
    '00000000-0000-0000-0000-000000000003',
    'enterprise',
    75000,
    'FCFA', 
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW()
) ON CONFLICT DO NOTHING;
