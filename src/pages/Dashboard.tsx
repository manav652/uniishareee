import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, Loader2, Layers, Eye, Trash2, ShoppingBag, CheckCircle2, RotateCcw, X, Clock, MessageSquare, Download } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface OwnerListing extends ListingCardData {
  status: "active" | "sold" | "archived";
}

interface IncomingOrder {
  id: string;
  price: number;
  created_at: string;
  status: "pending" | "confirmed" | "rejected";
  listing_id: string;
  buyer_id: string;
  listing: { id: string; title: string; images: string[]; price: number } | null;
  buyer: { id: string; full_name: string; email: string; avatar_url: string | null; branch: string | null; year: string | null; university: string | null } | null;
}

function DashboardInner() {
  const { user } = useAuth();
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<IncomingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("listings")
        .select("id, title, description, price, category, listing_type, images, views, status")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select("id, price, created_at, status, listing:listings(id, title, images, category, listing_type, views, status, price, file_url)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select("id, price, created_at, status, listing_id, buyer_id, listing:listings(id, title, images, price), buyer:profiles!purchases_buyer_id_fkey(id, full_name, email, avatar_url, branch, year, university)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([l, p, inc]) => {
      setListings((l.data as any) ?? []);
      setPurchases(p.data ?? []);
      setIncoming((inc.data as any) ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  const cancelListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast({ title: "Couldn't cancel listing", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Listing cancelled" });
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const toggleSold = async (id: string, currentStatus: "active" | "sold" | "archived") => {
    const newStatus = currentStatus === "sold" ? "active" : "sold";
    const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", id);
    if (error) { toast({ title: "Couldn't update", description: error.message, variant: "destructive" }); return; }
    toast({ title: newStatus === "sold" ? "Marked as sold out" : "Re-listed as active" });
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
  };

  const confirmOrder = async (order: IncomingOrder) => {
    const { error: uErr } = await supabase.from("purchases").update({ status: "confirmed" }).eq("id", order.id);
    if (uErr) { toast({ title: "Couldn't confirm", description: uErr.message, variant: "destructive" }); return; }
    if (order.listing_id) {
      await supabase.from("listings").update({ status: "sold" }).eq("id", order.listing_id);
    }
    toast({ title: "Order confirmed", description: "Listing marked as sold." });
    loadAll();
  };

  const rejectOrder = async (order: IncomingOrder) => {
    const { error } = await supabase.from("purchases").update({ status: "rejected" }).eq("id", order.id);
    if (error) { toast({ title: "Couldn't reject", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Order rejected" });
    setIncoming((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "rejected" } : o));
  };

  const downloadProject = async (path: string, title: string) => {
    const { data, error } = await supabase.storage.from("listing-files").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download unavailable", description: error?.message ?? "Try again in a moment.", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = title;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const totalViews = listings.reduce((sum, l) => sum + (l.views ?? 0), 0);
  const soldCount = listings.filter((l) => l.status === "sold").length;
  const pendingOrders = incoming.filter((o) => o.status === "pending");

  const statusBadge = (status: "pending" | "confirmed" | "rejected") => {
    if (status === "pending") return <Badge className="bg-warning/20 text-warning border border-warning/30 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    if (status === "confirmed") return <Badge className="bg-success/20 text-success border border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border border-destructive/30 gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
  };

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">My dashboard</h1>
            <p className="text-muted-foreground">Manage everything you've shared and purchased.</p>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow gap-2">
            <Link to="/upload"><Plus className="h-4 w-4" /> New listing</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glow-card rounded-2xl p-5">
            <Layers className="h-5 w-5 text-primary-glow mb-2" />
            <div className="text-2xl font-display font-bold">{listings.length}</div>
            <div className="text-xs text-muted-foreground">Listings</div>
          </div>
          <div className="glow-card rounded-2xl p-5">
            <Eye className="h-5 w-5 text-primary-glow mb-2" />
            <div className="text-2xl font-display font-bold">{totalViews}</div>
            <div className="text-xs text-muted-foreground">Total views</div>
          </div>
          <div className="glow-card rounded-2xl p-5">
            <ShoppingBag className="h-5 w-5 text-success mb-2" />
            <div className="text-2xl font-display font-bold">{soldCount}</div>
            <div className="text-xs text-muted-foreground">Sold</div>
          </div>
          <div className="glow-card rounded-2xl p-5">
            <Clock className="h-5 w-5 text-warning mb-2" />
            <div className="text-2xl font-display font-bold">{pendingOrders.length}</div>
            <div className="text-xs text-muted-foreground">Pending orders</div>
          </div>
        </div>

        {/* Incoming orders for the seller */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">Incoming orders</h2>
            {pendingOrders.length > 0 && (
              <Badge className="bg-warning/20 text-warning border border-warning/30">{pendingOrders.length} new</Badge>
            )}
          </div>
          {loading ? null : incoming.length === 0 ? (
            <div className="glow-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No one has placed an order yet. Once a buyer hits "Buy now", you'll see them here to confirm.
            </div>
          ) : (
            <div className="space-y-3">
              {incoming.map((order) => (
                <div key={order.id} className="glow-card rounded-2xl p-5 flex flex-wrap items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/30 shrink-0">
                    {order.buyer?.avatar_url && <AvatarImage src={order.buyer.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {order.buyer?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{order.buyer?.full_name ?? "Unknown buyer"}</span>
                      {statusBadge(order.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[order.buyer?.branch, order.buyer?.year, order.buyer?.university].filter(Boolean).join(" · ") || order.buyer?.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      wants <Link to={`/listing/${order.listing_id}`} className="text-primary-glow hover:underline">{order.listing?.title ?? "this listing"}</Link>
                      <span className="ml-2 font-semibold text-foreground">₹{Number(order.price).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    {order.status === "pending" ? (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-primary gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Confirm
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm this order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{order.listing?.title}" will be marked as SOLD OUT and removed from active sales.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Not yet</AlertDialogCancel>
                              <AlertDialogAction onClick={() => confirmOrder(order)} className="bg-gradient-primary">
                                Yes, confirm sale
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="outline" onClick={() => rejectOrder(order)} className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Your listings</h2>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : listings.length === 0 ? (
            <div className="glow-card rounded-2xl p-12 text-center space-y-3">
              <p className="text-muted-foreground">You haven't listed anything yet.</p>
              <Button asChild className="bg-gradient-primary"><Link to="/upload">Create first listing</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((l) => (
                <div key={l.id} className="space-y-2">
                  <ListingCard listing={l} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => toggleSold(l.id, l.status)}
                      className={`gap-2 ${l.status === "sold" ? "border-primary/40 text-primary hover:bg-primary/10" : "border-success/40 text-success hover:bg-success/10 hover:text-success"}`}
                    >
                      {l.status === "sold" ? (<><RotateCcw className="h-3.5 w-3.5" /> Re-list</>) : (<><CheckCircle2 className="h-3.5 w-3.5" /> Mark sold</>)}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this listing?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{l.title}" will be removed permanently. This can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelListing(l.id)} className="bg-destructive hover:bg-destructive/90">
                            Yes, cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Your orders</h2>
          {purchases.length === 0 ? (
            <div className="glow-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              You haven't placed any orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.filter((p) => p.listing).map((p) => (
                <div key={p.id} className="glow-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {p.listing.images?.[0] && <img src={p.listing.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Link to={`/listing/${p.listing.id}`} className="font-semibold hover:text-primary-glow">{p.listing.title}</Link>
                    <div className="text-sm text-muted-foreground">₹{Number(p.price).toLocaleString("en-IN")}</div>
                  </div>
                  {statusBadge(p.status ?? "pending")}
                  {p.status === "confirmed" && p.listing.file_url && (
                    <Button size="sm" onClick={() => downloadProject(p.listing.file_url, `${p.listing.title}.zip`)}
                      className="bg-gradient-primary shadow-glow gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  )}
                  {p.status === "confirmed" && !p.listing.file_url && (
                    <span className="text-xs text-muted-foreground">No file attached — contact seller</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function Dashboard() {
  return <ProtectedRoute><DashboardInner /></ProtectedRoute>;
}
