CREATE TABLE public.note_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_id)
);

ALTER TABLE public.note_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.note_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim notes" ON public.note_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own claims" ON public.note_claims
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_note_claims_user ON public.note_claims(user_id);