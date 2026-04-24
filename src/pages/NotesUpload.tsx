import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload as UploadIcon, FileText, ArrowLeft } from "lucide-react";

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.zip";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

function NotesUploadInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!file) { toast({ title: "Pick a file to share", variant: "destructive" }); return; }
    if (file.size > MAX_SIZE) { toast({ title: "File too large", description: "Max 20 MB", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "Add a title", variant: "destructive" }); return; }

    setSubmitting(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("notes-files").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
    });
    if (upErr) { setSubmitting(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }

    const { data: pub } = supabase.storage.from("notes-files").getPublicUrl(path);

    const { error: insErr } = await supabase.from("notes").insert({
      uploader_id: user.id,
      title: title.trim(),
      subject: subject.trim() || null,
      description: description.trim() || null,
      file_url: pub.publicUrl,
      file_name: file.name,
      file_size: file.size,
    });
    setSubmitting(false);
    if (insErr) { toast({ title: "Couldn't save note", description: insErr.message, variant: "destructive" }); return; }

    toast({ title: "Notes shared!", description: "Everyone can now download your notes." });
    navigate("/notes");
  };

  return (
    <AppShell>
      <div className="container max-w-2xl py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to notes
        </Button>

        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Share notes publicly</h1>
          <p className="text-muted-foreground">Upload a file and anyone — even visitors — can download it for free.</p>
        </div>

        <form onSubmit={onSubmit} className="glow-card rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. DSA — Linked Lists complete notes" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject / topic</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures, OS, Microeconomics" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="What's inside? Which chapters / lectures does it cover?" />
          </div>

          <div className="space-y-2">
            <Label>File *</Label>
            <label className="block">
              <input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              <div className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition rounded-xl p-8 text-center cursor-pointer space-y-2">
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-primary-glow mx-auto" />
                    <div className="font-semibold">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</div>
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-8 w-8 text-primary-glow mx-auto" />
                    <div className="font-semibold">Click to upload</div>
                    <div className="text-xs text-muted-foreground">PDF, DOC, PPT, TXT, ZIP — up to 20 MB</div>
                  </>
                )}
              </div>
            </label>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow h-12 gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
            Share notes publicly
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

export default function NotesUpload() {
  return <ProtectedRoute><NotesUploadInner /></ProtectedRoute>;
}
