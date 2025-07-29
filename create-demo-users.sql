-- Script to recreate demo users in Supabase
-- Run this in your Supabase SQL Editor

-- First, create the auth users (you may need to use Supabase Dashboard for this)
-- Go to Authentication > Users > Add User manually for each:

-- 1. basic@cabinet.com / basic123
-- 2. demo@cabinet.com / demo123  
-- 3. enterprise@cabinet.com / enterprise123

-- Then run this SQL to create their profiles:

-- Basic plan demo user
INSERT INTO public.profiles (
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
    (SELECT id FROM auth.users WHERE email = 'basic@cabinet.com' LIMIT 1),
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
    firm_name = 'Cabinet Martin & Associés',
    subscription_plan = 'basic',
    subscription_status = 'active',
    subscription_started_at = NOW(),
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Premium plan demo user (demo@cabinet.com)
INSERT INTO public.profiles (
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
    (SELECT id FROM auth.users WHERE email = 'demo@cabinet.com' LIMIT 1),
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
    firm_name = 'SCP Diallo & Partners',
    subscription_plan = 'premium',
    subscription_status = 'active', 
    subscription_started_at = NOW(),
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Enterprise plan demo user
INSERT INTO public.profiles (
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
    (SELECT id FROM auth.users WHERE email = 'enterprise@cabinet.com' LIMIT 1),
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
    firm_name = 'Groupe Juridique Sahel',
    subscription_plan = 'enterprise',
    subscription_status = 'active',
    subscription_started_at = NOW(), 
    subscription_expires_at = NOW() + INTERVAL '30 days';

-- Create payment history for demo users
INSERT INTO public.subscription_payments (
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
    (SELECT id FROM auth.users WHERE email = 'basic@cabinet.com' LIMIT 1),
    'basic',
    15000,
    'FCFA',
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW() - INTERVAL '5 days'
),
(
    (SELECT id FROM auth.users WHERE email = 'demo@cabinet.com' LIMIT 1),
    'premium', 
    35000,
    'FCFA',
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW() - INTERVAL '3 days'
),
(
    (SELECT id FROM auth.users WHERE email = 'enterprise@cabinet.com' LIMIT 1),
    'enterprise',
    75000,
    'FCFA', 
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    'paid',
    NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- Add some initial notifications for demo users
INSERT INTO public.notifications (
    firm_id,
    type,
    title,
    message,
    channel,
    recipient,
    status,
    created_at
) VALUES
(
    (SELECT id FROM auth.users WHERE email = 'demo@cabinet.com' LIMIT 1),
    'welcome',
    'Bienvenue dans JURIS',
    'Félicitations ! Votre compte Premium est activé. Explorez toutes les fonctionnalités avancées disponibles.',
    'in_app',
    'user',
    'sent',
    NOW() - INTERVAL '1 hour'
),
(
    (SELECT id FROM auth.users WHERE email = 'enterprise@cabinet.com' LIMIT 1),
    'welcome', 
    'Bienvenue dans JURIS Enterprise',
    'Votre plan Enterprise est activé. Vous avez accès à toutes les fonctionnalités premium et aux outils avancés.',
    'in_app',
    'user',
    'sent',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT DO NOTHING;
