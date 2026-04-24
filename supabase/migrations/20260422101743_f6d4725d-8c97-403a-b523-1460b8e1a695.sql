CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create their purchases"
ON public.purchases FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can view their purchases"
ON public.purchases FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE INDEX idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX idx_purchases_seller ON public.purchases(seller_id);
CREATE INDEX idx_purchases_listing ON public.purchases(listing_id);