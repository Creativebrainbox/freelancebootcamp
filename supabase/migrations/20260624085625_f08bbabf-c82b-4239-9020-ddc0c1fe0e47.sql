
-- 1) Remove applications from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.applications;

-- 2) Move has_role to a private schema (not exposed via PostgREST), update policies
CREATE SCHEMA IF NOT EXISTS app_auth;
GRANT USAGE ON SCHEMA app_auth TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION app_auth.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION app_auth.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_auth.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies to use app_auth.has_role
DROP POLICY IF EXISTS "Admins read applications" ON public.applications;
DROP POLICY IF EXISTS "Admins update applications" ON public.applications;
DROP POLICY IF EXISTS "Admins delete applications" ON public.applications;
DROP POLICY IF EXISTS "Admins read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins manage settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;

CREATE POLICY "Admins read applications" ON public.applications
  FOR SELECT TO authenticated USING (app_auth.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (app_auth.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_auth.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete applications" ON public.applications
  FOR DELETE TO authenticated USING (app_auth.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read email logs" ON public.email_logs
  FOR SELECT TO authenticated USING (app_auth.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage settings" ON public.settings
  FOR ALL TO authenticated
  USING (app_auth.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_auth.has_role(auth.uid(), 'admin'));

-- Drop the now-unused public.has_role (was exposed via PostgREST /rpc/)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 3) Public-safe settings accessor: only non-sensitive columns, excludes whatsapp_group_link
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (
  bootcamp_name text,
  start_date date,
  end_date date,
  daily_time text,
  registration_status text,
  max_participants integer,
  venue_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bootcamp_name, start_date, end_date, daily_time, registration_status, max_participants, venue_address
  FROM public.settings
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated, service_role;

-- 4) Server-side admin check helper used by the admin route guard
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_auth.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;
