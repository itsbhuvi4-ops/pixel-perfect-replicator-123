DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles authenticated read" ON public.profiles FOR SELECT TO authenticated USING (true);