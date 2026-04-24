-- Add status to purchases for seller-confirmed orders
CREATE TYPE public.purchase_status AS ENUM ('pending', 'confirmed', 'rejected');

ALTER TABLE public.purchases
  ADD COLUMN status public.purchase_status NOT NULL DEFAULT 'pending';

-- Allow sellers to update purchases (to confirm/reject)
CREATE POLICY "Sellers can update their purchases"
ON public.purchases
FOR UPDATE
USING (auth.uid() = seller_id);

-- Allow buyers to cancel (delete) their own pending purchases
CREATE POLICY "Buyers can delete their pending purchases"
ON public.purchases
FOR DELETE
USING (auth.uid() = buyer_id AND status = 'pending');