
-- Drop all existing restrictive policies on candidates
DROP POLICY IF EXISTS "Anyone can insert candidates via public form" ON public.candidates;
DROP POLICY IF EXISTS "Admins and sellers can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins and sellers can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can delete candidates" ON public.candidates;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can insert candidates via public form"
ON public.candidates FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins and sellers can view candidates"
ON public.candidates FOR SELECT
TO authenticated
USING (is_admin_or_seller(auth.uid()));

CREATE POLICY "Admins and sellers can update candidates"
ON public.candidates FOR UPDATE
TO authenticated
USING (is_admin_or_seller(auth.uid()));

CREATE POLICY "Admins can delete candidates"
ON public.candidates FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));
