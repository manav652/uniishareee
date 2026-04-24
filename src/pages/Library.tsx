import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Package, Clock, CheckCircle2, X, BookMarked } from "lucide-react";

interface Purchase {
  id: string;
  price: number;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
  listing: { id: string; title: string; images: string[]; file_url: string | null } | null;
}

const statusBadge = (status: "pending" | "confirmed" | "rejected") => {
  if (status === "pending") return <Badge className="bg-warning/20 text-warning border border-warning/30 gap-1"><Clock className="h-3 w-3" /> Awaiting seller</Badge>;
  if (status === "confirmed") return <Badge className="bg-success/20 text-success border border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border border-destructive/30 gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
};

function LibraryInner() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("purchases")
      .select("id, price, status, created_at, listing:listings(id, title, images, file_url)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPurchases((data as any) ?? []);
        setLoading(false);
      });
  }, [user]);

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

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  const validPurchases = purchases.filter((p) => p.listing);

  return (
    <AppShell>
      <div className="container max-w-6xl py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-primary-glow" /> My Library
          </h1>
          <p className="text-muted-foreground">All the projects you've purchased.</p>
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-glow" /> Purchased projects
            <Badge className="bg-primary/20 text-primary-glow border border-primary/30">{validPurchases.length}</Badge>
          </h2>
          {validPurchases.length === 0 ? (
            <div className="glow-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              You haven't bought any projects yet. <Link to="/browse" className="text-primary-glow hover:underline">Browse the marketplace →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {validPurchases.map((p) => (
                <div key={p.id} className="glow-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {p.listing!.images?.[0] && <img src={p.listing!.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Link to={`/listing/${p.listing!.id}`} className="font-semibold hover:text-primary-glow">{p.listing!.title}</Link>
                    <div className="text-sm text-muted-foreground">₹{Number(p.price).toLocaleString("en-IN")}</div>
                  </div>
                  {statusBadge(p.status)}
                  {p.status === "confirmed" && p.listing!.file_url && (
                    <Button size="sm" onClick={() => downloadProject(p.listing!.file_url!, `${p.listing!.title}.zip`)}
                      className="bg-gradient-primary shadow-glow gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  )}
                  {p.status === "confirmed" && !p.listing!.file_url && (
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

export default function Library() {
  return <ProtectedRoute><LibraryInner /></ProtectedRoute>;
}
