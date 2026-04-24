import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, Search, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  downloads: number;
  created_at: string;
  uploader_id: string;
  uploader: { full_name: string; avatar_url: string | null; university: string | null } | null;
}

const formatSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    let q = supabase
      .from("notes")
      .select("*, uploader:profiles!notes_uploader_id_fkey(full_name, avatar_url, university)")
      .order("created_at", { ascending: false });
    if (search.trim()) q = q.or(`title.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
    q.then(({ data }) => {
      setNotes((data as any) ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const download = async (note: Note) => {
    await supabase.from("notes").update({ downloads: note.downloads + 1 }).eq("id", note.id);
    window.open(note.file_url, "_blank");
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, downloads: n.downloads + 1 } : n));
  };

  const deleteNote = async (note: Note) => {
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) { toast({ title: "Couldn't delete", description: error.message, variant: "destructive" }); return; }
    // also remove the file
    const path = note.file_url.split("/notes-files/")[1];
    if (path) await supabase.storage.from("notes-files").remove([path]);
    toast({ title: "Note deleted" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  return (
    <AppShell>
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Shared notes</h1>
            <p className="text-muted-foreground">Free study notes, uploaded by students for everyone.</p>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow gap-2">
            <Link to="/notes/upload"><Plus className="h-4 w-4" /> Share notes</Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, subject, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 glow-card border-primary/20"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : notes.length === 0 ? (
          <div className="glow-card rounded-2xl p-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-primary-glow mx-auto" />
            <p className="text-muted-foreground">No notes yet. Be the first to share!</p>
            <Button asChild className="bg-gradient-primary"><Link to="/notes/upload">Share your notes</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => (
              <div key={note.id} className="glow-card rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold leading-tight truncate">{note.title}</h3>
                    {note.subject && (
                      <Badge className="mt-1 bg-primary/20 text-primary-glow border border-primary/30">{note.subject}</Badge>
                    )}
                  </div>
                </div>

                {note.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{note.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    {note.uploader?.avatar_url && <AvatarImage src={note.uploader.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-[10px] text-primary-foreground">
                      {note.uploader?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{note.uploader?.full_name ?? "Anonymous"}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                  <span>{formatSize(note.file_size)}</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {note.downloads}</span>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => download(note)} className="flex-1 bg-gradient-primary gap-2">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  {user?.id === note.uploader_id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                          <AlertDialogDescription>"{note.title}" will be removed for everyone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteNote(note)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
