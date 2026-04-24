import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, GraduationCap } from "lucide-react";
import heroImg from "@/assets/hero-student.jpg";

// University email validation: must contain "edu" in domain (covers .edu, .edu.in, ac.uk-style edu)
const emailSchema = z.string().trim().email().max(255).refine(
  (e) => /\.edu(\.|$)/i.test(e.split("@")[1] ?? ""),
  { message: "Use your university email (must contain .edu in the domain)" }
);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(128),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(100),
});

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const redirectTo = params.get("redirect") ?? "/browse";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate(redirectTo); }, [user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const data = signupSchema.parse(form);
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: data.fullName,
              university: data.email.split("@")[1],
            },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome to UniShare 🎓", description: "Your account is ready." });
      } else {
        const data = loginSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: hero */}
      <div className="hidden md:flex relative bg-gradient-hero p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <Link to="/" className="relative"><Logo /></Link>
        <div className="relative space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Share knowledge.<br />Earn from your <span className="text-gradient">work.</span>
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Join a verified network of students trading academic projects, source code, and study notes.
          </p>
          <img src={heroImg} alt="" width={1024} height={768} className="rounded-2xl shadow-elevated max-w-sm" />
        </div>
        <div className="relative text-xs text-muted-foreground">© UniShare · For students, by students.</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="md:hidden mb-8"><Logo /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "signup" ? "Use your university email to get started." : "Sign in to your UniShare account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" required maxLength={100} value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> University email
              </Label>
              <Input id="email" type="email" required maxLength={255} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@yourcollege.edu" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} maxLength={128} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow h-11 text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to UniShare?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="text-primary-glow font-medium hover:underline">
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
