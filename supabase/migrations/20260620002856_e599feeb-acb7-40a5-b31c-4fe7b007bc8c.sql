
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Settings (singleton-like, but allow multiple rows; app reads first/active)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bootcamp_name TEXT NOT NULL DEFAULT '5-Day Freelancing Bootcamp',
  start_date DATE,
  end_date DATE,
  daily_time TEXT NOT NULL DEFAULT '4:00 PM - 6:00 PM',
  whatsapp_group_link TEXT NOT NULL DEFAULT '',
  registration_status TEXT NOT NULL DEFAULT 'open' CHECK (registration_status IN ('open','closed')),
  max_participants INTEGER NOT NULL DEFAULT 50,
  venue_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.settings (bootcamp_name) VALUES ('5-Day Freelancing Bootcamp');

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  education_level TEXT,
  institution TEXT,
  department TEXT,
  level TEXT,
  state TEXT,
  city TEXT,
  physical_address TEXT,
  participation_format TEXT NOT NULL CHECK (participation_format IN ('physical','online')),
  freelanced_before TEXT,
  freelancing_interest TEXT,
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  UNIQUE (email),
  UNIQUE (whatsapp)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT INSERT ON public.applications TO anon;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
-- Anyone can submit (insert); only admins can read/update/delete
CREATE POLICY "Anyone can apply" ON public.applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read applications" ON public.applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update applications" ON public.applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete applications" ON public.applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public counters function: returns total + approved without exposing rows
CREATE OR REPLACE FUNCTION public.get_application_counts()
RETURNS TABLE(total BIGINT, approved BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::BIGINT AS total,
         COUNT(*) FILTER (WHERE status = 'approved')::BIGINT AS approved
  FROM public.applications
$$;
GRANT EXECUTE ON FUNCTION public.get_application_counts() TO anon, authenticated;

-- Email logs
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email logs" ON public.email_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
