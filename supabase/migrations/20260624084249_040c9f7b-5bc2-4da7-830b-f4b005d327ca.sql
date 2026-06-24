-- Mark the primary admin so they cannot be removed
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Set helloblackdiamondagency@gmail.com as the primary admin (if they have an admin row)
UPDATE public.user_roles ur
SET is_primary = true
WHERE ur.role = 'admin'
  AND ur.user_id IN (SELECT id FROM auth.users WHERE email = 'helloblackdiamondagency@gmail.com');

-- If for some reason no row was marked, mark the earliest admin as primary
UPDATE public.user_roles
SET is_primary = true
WHERE id = (
  SELECT id FROM public.user_roles
  WHERE role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND is_primary = true)
  ORDER BY created_at ASC
  LIMIT 1
);

-- Allow admins to manage other admin roles via service-role server fns (RLS still blocks direct client writes).
-- (No new policies needed; we'll use supabaseAdmin in server functions guarded by has_role.)
