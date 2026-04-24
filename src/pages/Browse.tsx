import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CATEGORIES } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<"recent" | "popular" | "price_low" | "price_high">("recent");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const category = params.get("category");

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("listings")
      .select("id, title, description, price, category, listing_type, images, views, status, seller:profiles!listings_seller_id_fkey(full_name, branch)")
      .neq("status", "archived");

    if (category) q = q.eq("category", category as any);
    if (search) q = q.ilike("title", `%${search}%`);

    if (sort === "recent") q = q.order("created_at", { ascending: false });
    else if (sort === "popular") q = q.order("views", { ascending: false });
    else if (sort === "price_low") q = q.order("price", { ascending: true });
    else q = q.order("price", { ascending: false });

    q.then(({ data, error }) => {
      if (!error && data) setListings(data as any);
      setLoading(false);
    });
  }, [category, search, sort]);

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("listing_id").eq("user_id", user.id).then(({ data }) => {
      if (data) setFavorites(new Set(data.map((d) => d.listing_id)));
    });
  }, [user]);

  const toggleFavorite = async (listingId: string) => {
    if (!user) { toast({ title: "Sign in to save listings" }); return; }
    if (favorites.has(listingId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
      const next = new Set(favorites); next.delete(listingId); setFavorites(next);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
      setFavorites(new Set(favorites).add(listingId));
    }
  };

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Browse projects</h1>
          <p className="text-muted-foreground">Discover academic projects, source code, and notes from students worldwide.</p>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, notes, subjects..." className="pl-10 h-11" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}
            className="h-11 px-4 rounded-md bg-input border border-border text-sm">
            <option value="recent">Most recent</option>
            <option value="popular">Most popular</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
          </select>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button variant={!category ? "default" : "outline"} size="sm"
            className={!category ? "bg-gradient-primary" : ""}
            onClick={() => setParams({})}>All</Button>
          {CATEGORIES.map((c) => (
            <Button key={c.key} variant={category === c.key ? "default" : "outline"} size="sm"
              className={`shrink-0 ${category === c.key ? "bg-gradient-primary" : ""}`}
              onClick={() => setParams({ category: c.key })}>
              <c.icon className="h-3.5 w-3.5 mr-1.5" />
              {c.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <SlidersHorizontal className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No listings match your filters yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} onFavorite={toggleFavorite} isFavorite={favorites.has(l.id)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
