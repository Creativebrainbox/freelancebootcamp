REVOKE ALL ON public.applications FROM anon, authenticated;
REVOKE ALL ON public.settings FROM anon, authenticated;
REVOKE ALL ON public.email_logs FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;

GRANT INSERT ON public.applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT ALL ON public.email_logs TO service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_counts() TO anon, authenticated;