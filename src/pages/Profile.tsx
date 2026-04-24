import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, GraduationCap } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  branch: z.string().trim().max(100).optional().or(z.literal("")),
  year: z.string().trim().max(20).optional().or(z.literal("")),
  university: z.string().trim().max(150).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

function ProfileInner() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", branch: "", year: "", university: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          branch: data.branch ?? "",
          year: data.year ?? "",
          university: data.university ?? "",
          bio: data.bio ?? "",
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const data = schema.parse(form);
      const { error } = await supabase.from("profiles").update(data).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.errors?.[0]?.message ?? err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  return (
    <AppShell>
      <div className="container max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-primary/30">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
              {(form.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-3xl font-bold">{form.full_name || "Your profile"}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glow-card rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <Label>Full name</Label>
            <Input required maxLength={100} value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>University</Label>
              <Input maxLength={150} value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })} />
            </div>
            <div>
              <Label>Year</Label>
              <Input maxLength={20} placeholder="e.g. 3rd year" value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Branch / Major</Label>
            <Input maxLength={100} placeholder="e.g. Computer Science" value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })} />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={3} maxLength={500} value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell others what you're working on..." />
          </div>
          <Button type="submit" disabled={saving} className="bg-gradient-primary shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

export default function Profile() {
  return <ProtectedRoute><ProfileInner /></ProtectedRoute>;
}
