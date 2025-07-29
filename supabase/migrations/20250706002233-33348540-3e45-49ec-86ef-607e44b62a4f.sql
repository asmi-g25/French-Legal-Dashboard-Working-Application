
-- Create a profiles table to store additional user information
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  firm_name TEXT NOT NULL,
  phone TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_plan TEXT DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, firm_name, phone, subscription_status, subscription_plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firm_name', 'Nouveau Cabinet'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'inactive',
    'basic'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert demo users (these will be created in the auth.users table)
-- Note: In a real app, users would sign up normally, but for demo purposes we can create these
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_sent_at,
  recovery_token,
  email_change_sent_at,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@cabinet.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"firm_name": "Cabinet Juridique Premium", "phone": "+33 1 23 45 67 89"}',
  false,
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'basic@cabinet.com',
  crypt('basic123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"firm_name": "Cabinet Juridique Basic", "phone": "+33 1 98 76 54 32"}',
  false,
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'enterprise@cabinet.com',
  crypt('enterprise123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"firm_name": "Cabinet Juridique Enterprise", "phone": "+33 1 11 22 33 44"}',
  false,
  NOW()
);

-- Update the profiles for demo users with subscription info
UPDATE public.profiles SET 
  subscription_status = 'active',
  subscription_plan = 'premium',
  subscription_expires_at = NOW() + INTERVAL '30 days',
  subscription_started_at = NOW() - INTERVAL '15 days'
WHERE id = (SELECT id FROM auth.users WHERE email = 'demo@cabinet.com');

UPDATE public.profiles SET 
  subscription_status = 'active',
  subscription_plan = 'basic',
  subscription_expires_at = NOW() + INTERVAL '20 days',
  subscription_started_at = NOW() - INTERVAL '10 days'
WHERE id = (SELECT id FROM auth.users WHERE email = 'basic@cabinet.com');

UPDATE public.profiles SET 
  subscription_status = 'active',
  subscription_plan = 'enterprise',
  subscription_expires_at = NOW() + INTERVAL '365 days',
  subscription_started_at = NOW() - INTERVAL '60 days'
WHERE id = (SELECT id FROM auth.users WHERE email = 'enterprise@cabinet.com');
