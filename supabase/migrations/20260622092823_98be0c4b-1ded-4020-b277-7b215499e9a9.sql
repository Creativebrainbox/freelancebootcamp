DROP POLICY IF EXISTS "Anyone can apply" ON public.applications;
CREATE POLICY "Anyone can submit physical pending applications"
ON public.applications
FOR INSERT
TO anon, authenticated
WITH CHECK (participation_format = 'physical' AND status = 'pending');