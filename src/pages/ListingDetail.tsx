import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_MAP } from "@/lib/categories";
import { Heart, MessageSquare, Eye, Loader2, ArrowLeft, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("listings")
      .select("*, seller:profiles!listings_seller_id_fkey(id, full_name, branch, year, university, avatar_url)")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        setListing(data);
        setLoading(false);
        if (data) {
          await supabase.from("listings").update({ views: (data.views ?? 0) + 1 }).eq("id", id);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", id).maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) { navigate("/auth"); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id!);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: id! });
      setIsFavorite(true);
    }
  };

  const startChat = async () => {
    if (!user) { navigate("/auth"); return; }
    if (user.id === listing.seller_id) { toast({ title: "You can't message yourself" }); return; }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await supabase.from("conversations").insert({
        listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id,
      }).select("id").single();
      if (error) { toast({ title: "Could not start chat", description: error.message, variant: "destructive" }); return; }
      convId = created.id;
    }
    navigate(`/messages/${convId}`);
  };

  const buyNow = async () => {
    if (!user) { navigate("/auth"); return; }
    if (user.id === listing.seller_id) { toast({ title: "You can't buy your own listing" }); return; }
    setBuying(true);
    const { error: pErr } = await supabase.from("purchases").insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      price: listing.price ?? 0,
    });
    setBuying(false);
    if (pErr) {
      toast({ title: "Order failed", description: pErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Order placed!", description: "Waiting for the seller to confirm your order." });
  };

  const cancelListing = async () => {
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (error) { toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Listing cancelled" });
    navigate("/dashboard");
  };

  if (loading) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }
  if (!listing) {
    return <AppShell><div className="container py-20 text-center text-muted-foreground">Listing not found.</div></AppShell>;
  }

  const category = CATEGORY_MAP[listing.category];
  const isOwner = user?.id === listing.seller_id;
  const isSold = listing.status === "sold";
  const isFree = listing.listing_type === "free";

  return (
    <AppShell>
      <div className="container max-w-6xl py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-3">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-hero relative">
              {listing.images?.[activeImage] ? (
                <img src={listing.images[activeImage]} alt={listing.title} className={`w-full h-full object-cover ${isSold ? "opacity-60 grayscale" : ""}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <category.icon className="h-24 w-24 text-primary-foreground/40" />
                </div>
              )}
              {isSold && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-display font-bold text-5xl text-destructive-foreground bg-destructive/85 px-8 py-3 rounded-xl rotate-[-8deg] shadow-2xl">SOLD OUT</span>
                </div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-primary shadow-glow" : "border-border opacity-70"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/20 text-primary-glow border border-primary/30">
                  <category.icon className="h-3 w-3 mr-1" /> {category.label}
                </Badge>
                <Badge className={isSold ? "bg-destructive text-destructive-foreground" : isFree ? "bg-success text-background" : "bg-gradient-primary"}>
                  {isSold ? "SOLD OUT" : isFree ? "FREE" : "FOR SALE"}
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-bold">{listing.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{listing.views} views</span>
              </div>
            </div>

            <div className="glow-card rounded-2xl p-5">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="text-4xl font-display font-bold text-gradient">
                {isFree ? "Free" : `₹${Number(listing.price).toLocaleString("en-IN")}`}
              </div>
            </div>

            <div className="glow-card rounded-2xl p-5 space-y-3">
              <div className="text-xs text-muted-foreground">Listed by</div>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {listing.seller?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{listing.seller?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[listing.seller?.branch, listing.seller?.year, listing.seller?.university].filter(Boolean).join(" · ") || "Student"}
                  </div>
                </div>
              </div>
            </div>

            {isSold ? (
              <div className="glow-card rounded-2xl p-5 flex items-center gap-3 border border-destructive/30">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div>
                  <div className="font-semibold">This project has been sold</div>
                  <div className="text-xs text-muted-foreground">It's no longer available for purchase.</div>
                </div>
              </div>
            ) : isOwner ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Cancel listing
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this listing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{listing.title}" will be removed permanently. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={cancelListing} className="bg-destructive hover:bg-destructive/90">
                      Yes, cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div className="space-y-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-gradient-primary shadow-glow h-12 gap-2" disabled={buying}>
                      {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                      {isFree ? "Claim this project" : `Buy now · ₹${Number(listing.price).toLocaleString("en-IN")}`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm purchase</AlertDialogTitle>
                      <AlertDialogDescription>
                        You're placing an order to {isFree ? "claim" : `purchase for ₹${Number(listing.price).toLocaleString("en-IN")}`} "{listing.title}". The seller must confirm before it's marked as sold.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Not yet</AlertDialogCancel>
                      <AlertDialogAction onClick={buyNow} className="bg-gradient-primary">
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={startChat} variant="outline" className="h-11 gap-2 border-primary/30">
                    <MessageSquare className="h-4 w-4" /> Message
                  </Button>
                  <Button onClick={toggleFavorite} variant="outline" className="h-11 gap-2 border-primary/30">
                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
                    {isFavorite ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glow-card rounded-2xl p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-3">About this project</h2>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.description}</p>
        </div>
      </div>
    </AppShell>
  );
}
