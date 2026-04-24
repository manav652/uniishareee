import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, Layers, Heart, MessageSquare, User, Plus, LogOut, Bell, FileText, Shield, BookMarked } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/browse", icon: Compass, label: "Browse" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/dashboard", icon: Layers, label: "My Listings" },
  { to: "/library", icon: BookMarked, label: "My Library" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; email: string } | null>(null);
  const items = isAdmin ? [...navItems, { to: "/admin", icon: Shield, label: "Admin" }] : navItems;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url, email").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-5 sticky top-0 h-screen">
        <div className="px-2 mb-8">
          <NavLink to="/"><Logo /></NavLink>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <Button variant="ghost" className="justify-start gap-3 text-sidebar-foreground" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
          <div className="md:hidden"><Logo size="sm" /></div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-glow gap-2" onClick={() => navigate("/upload")}>
                  <Plus className="h-4 w-4" /> Upload
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-4 w-4" />
                </Button>
                <button onClick={() => navigate("/profile")} className="flex items-center gap-2 hover:opacity-80">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {(profile?.full_name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
                <Button className="bg-gradient-primary shadow-glow" onClick={() => navigate("/auth?mode=signup")}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border flex items-center justify-around py-2">
          {items.slice(0, 5).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs ${isActive ? "text-primary" : "text-sidebar-foreground"}`
            }>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden h-16" />
      </div>
    </div>
  );
}
