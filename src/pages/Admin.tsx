import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function AdminInner() {
  const { isAdmin, loading } = useIsAdmin();
  const [listings, setListings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [l, n] = await Promise.all([
      supabase.from("listings").select("id, title, price, listing_type, status, seller_id, created_at").order("created_at", { ascending: false }),
      supabase.from("notes").select("id, title, subject, file_name, uploader_id, created_at").order("created_at", { ascending: false }),
    ]);
    setListings(l.data ?? []);
    setNotes(n.data ?? []);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) {
    return <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const deleteListing = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    setBusy(false);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Listing removed" });
    load();
  };
  const deleteNote = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("notes").delete().eq("id", id);
    setBusy(false);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Note removed" });
    load();
  };

  return (
    <AppShell>
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Console</h1>
            <p className="text-muted-foreground">Moderate listings and notes across UniShare.</p>
          </div>
        </div>

        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-3 mt-4">
            {listings.map((l) => (
              <div key={l.id} className="glow-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.listing_type === "free" ? "Free" : `₹${Number(l.price).toLocaleString("en-IN")}`} · {l.status} · {new Date(l.created_at).toLocaleDateString()}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={busy}><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete listing?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes "{l.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteListing(l.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {listings.length === 0 && <p className="text-muted-foreground text-sm">No listings.</p>}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 mt-4">
            {notes.map((n) => (
              <div key={n.id} className="glow-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.subject ?? "—"} · {n.file_name}</div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={busy}><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete note?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes "{n.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteNote(n.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {notes.length === 0 && <p className="text-muted-foreground text-sm">No notes.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default function Admin() {
  return <ProtectedRoute><AdminInner /></ProtectedRoute>;
}
