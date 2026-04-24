import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { toast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, X, FileArchive } from "lucide-react";

const MAX_ZIP = 50 * 1024 * 1024; // 50 MB
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  price: z.number().min(0).max(100000),
  category: z.string(),
});

function UploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", price: "0",
    category: "computer_science" as CategoryKey,
    listing_type: "sale" as "sale" | "free",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const data = schema.parse({
        title: form.title,
        description: form.description,
        price: form.listing_type === "free" ? 0 : Number(form.price),
        category: form.category,
      });

      // Upload images
      const imageUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        imageUrls.push(pub.publicUrl);
      }

      // Upload project ZIP (private bucket — store storage path, not public URL)
      let zipPath: string | null = null;
      if (zipFile) {
        if (zipFile.size > MAX_ZIP) throw new Error("Project file too large (max 50 MB)");
        const ext = zipFile.name.split(".").pop();
        zipPath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: zErr } = await supabase.storage.from("listing-files").upload(zipPath, zipFile, {
          contentType: zipFile.type || "application/zip",
        });
        if (zErr) throw zErr;
      }

      const { data: listing, error } = await supabase.from("listings").insert({
        seller_id: user.id,
        title: data.title,
        description: data.description,
        price: data.price,
        category: form.category,
        listing_type: form.listing_type,
        images: imageUrls,
        file_url: zipPath,
      }).select().single();
      if (error) throw error;

      toast({ title: "Listing published 🎉" });
      navigate(`/listing/${listing.id}`);
    } catch (err: any) {
      toast({ title: "Could not publish", description: err?.errors?.[0]?.message ?? err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 5);
    setFiles((prev) => [...prev, ...arr].slice(0, 5));
  };

  return (
    <AppShell>
      <div className="container max-w-3xl py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">List a new project</h1>
          <p className="text-muted-foreground">Share your work with the UniShare community.</p>
        </div>

        <form onSubmit={handleSubmit} className="glow-card rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <Label>Project title</Label>
            <Input required maxLength={120} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Smart Irrigation System — Final Year Project" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea required maxLength={2000} rows={5} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does it include? Tech stack, demo, documentation, source code..." />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as CategoryKey })}
                className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Listing type</Label>
              <div className="flex gap-2">
                {(["sale", "free"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, listing_type: t })}
                    className={`flex-1 h-10 rounded-md text-sm font-medium border transition-all ${
                      form.listing_type === t
                        ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                        : "bg-input border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {t === "sale" ? "Sell for ₹" : "Share for free"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {form.listing_type === "free"
                  ? "Anyone can request your project at no cost."
                  : "Set a price below. You approve each buyer manually."}
              </p>
            </div>
          </div>

          {form.listing_type === "sale" && (
            <div>
              <Label>Price (INR ₹)</Label>
              <Input type="number" min={0} step="0.01" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          )}

          <div>
            <Label>Cover images <span className="text-muted-foreground font-normal">(up to 5)</span></Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground">
                  <ImagePlus className="h-6 w-6 mb-1" />
                  <span className="text-xs">Add image</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Project file <span className="text-muted-foreground font-normal">(.zip — optional, up to 50 MB)</span></Label>
            <p className="text-xs text-muted-foreground mb-2">Buyers can download this only after you confirm their order.</p>
            <label className="block">
              <input type="file" accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} />
              <div className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition rounded-xl p-5 cursor-pointer flex items-center gap-3">
                <FileArchive className="h-6 w-6 text-primary-glow shrink-0" />
                {zipFile ? (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{zipFile.name}</div>
                    <div className="text-xs text-muted-foreground">{(zipFile.size / 1024 / 1024).toFixed(2)} MB · click to change</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Click to attach a ZIP of your project (source code, docs, demo…)</div>
                )}
                {zipFile && (
                  <button type="button" onClick={(e) => { e.preventDefault(); setZipFile(null); }}
                    className="h-7 w-7 rounded-full bg-background/70 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary shadow-glow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish listing"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

export default function Upload() {
  return <ProtectedRoute><UploadForm /></ProtectedRoute>;
}
