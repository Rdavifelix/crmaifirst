-- Adicionar política para permitir inserção anônima de leads (formulário público)
CREATE POLICY "Leads can be created by anyone (public form)" 
ON public.leads 
FOR INSERT 
TO anon
WITH CHECK (true);