import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Heart, Loader2 } from "lucide-react";

function FavoritesInner() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("listing:listings(id, title, description, price, category, listing_type, images, views, seller:profiles!listings_seller_id_fkey(full_name, branch))")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setListings((data ?? []).map((d: any) => d.listing).filter(Boolean));
        setLoading(false);
      });
  }, [user]);

  const removeFavorite = async (listingId: string) => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
    setListings(listings.filter((l) => l.id !== listingId));
  };

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Favorites</h1>
          <p className="text-muted-foreground">Listings you've saved for later.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <div className="glow-card rounded-2xl p-12 text-center space-y-3">
            <Heart className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No favorites yet — tap the heart on any listing to save it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => <ListingCard key={l.id} listing={l} onFavorite={removeFavorite} isFavorite />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function Favorites() {
  return <ProtectedRoute><FavoritesInner /></ProtectedRoute>;
}
