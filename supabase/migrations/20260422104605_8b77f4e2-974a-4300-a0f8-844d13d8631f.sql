-- Notes table for publicly shared study material
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes are viewable by everyone"
  ON public.notes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload notes"
  ON public.notes FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can update their notes"
  ON public.notes FOR UPDATE USING (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can delete their notes"
  ON public.notes FOR DELETE USING (auth.uid() = uploader_id);

CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public bucket for notes files
INSERT INTO storage.buckets (id, name, public) VALUES ('notes-files', 'notes-files', true);

CREATE POLICY "Notes files are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'notes-files');

CREATE POLICY "Users can upload their own notes files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own notes files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own notes files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notes-files' AND auth.uid()::text = (storage.foldername(name))[1]);