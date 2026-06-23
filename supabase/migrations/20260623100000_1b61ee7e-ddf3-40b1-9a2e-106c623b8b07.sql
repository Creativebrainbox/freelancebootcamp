
-- Fix admin RLS by granting EXECUTE on has_role to authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Add new application fields (referral + education conditional)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS study_track text,
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS graduation_year text,
  ADD COLUMN IF NOT EXISTS heard_about_bootcamp text,
  ADD COLUMN IF NOT EXISTS heard_about_other text,
  ADD COLUMN IF NOT EXISTS invited_by text;

-- Loosen submission insert policy: re-create to allow optional new fields (still pending+physical)
DROP POLICY IF EXISTS "Anyone can submit physical pending applications" ON public.applications;
CREATE POLICY "Anyone can submit physical pending applications"
  ON public.applications FOR INSERT TO anon, authenticated
  WITH CHECK (participation_format = 'physical' AND status = 'pending');

-- Auto-populate default WhatsApp group link if empty
UPDATE public.settings
  SET whatsapp_group_link = 'https://chat.whatsapp.com/C6eFNekcNfgHCLQX9jCAVv?s=sh&p=a&ilr=0'
  WHERE whatsapp_group_link IS NULL OR whatsapp_group_link = '';

-- Enable realtime broadcasts on applications
ALTER TABLE public.applications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='applications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.applications';
  END IF;
END $$;
