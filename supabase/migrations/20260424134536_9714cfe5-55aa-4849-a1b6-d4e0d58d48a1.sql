-- Storage policies for listing-files (private bucket containing project ZIPs)

-- Sellers (uploaders) can upload to a folder named after their user id
CREATE POLICY "Sellers upload own listing files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Sellers can read their own files
CREATE POLICY "Sellers read own listing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Sellers can delete their own files
CREATE POLICY "Sellers delete own listing files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Confirmed buyers can read the file of listings they purchased
CREATE POLICY "Confirmed buyers read purchased listing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-files'
  AND EXISTS (
    SELECT 1
    FROM public.purchases p
    JOIN public.listings l ON l.id = p.listing_id
    WHERE p.buyer_id = auth.uid()
      AND p.status = 'confirmed'
      AND l.file_url = storage.objects.name
  )
);

-- Admins can read any listing file (for moderation)
CREATE POLICY "Admins read all listing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-files'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
