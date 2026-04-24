import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Sparkles, MessageSquare, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CATEGORIES } from "@/lib/categories";
import heroImg from "@/assets/hero-student.jpg";

export default function Home() {
  const [featured, setFeatured] = useState<ListingCardData[]>([]);

  useEffect(() => {
    supabase
      .from("listings")
      .select("id, title, description, price, category, listing_type, images, views, seller:profiles!listings_seller_id_fkey(full_name, branch)")
      .eq("status", "active")
      .order("views", { ascending: false })
      .limit(4)
      .then(({ data }) => data && setFeatured(data as any));
  }, []);

  return (
    <AppShell>
      <div className="container max-w-7xl py-8 md:py-12 space-y-16">
        
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 md:p-12 lg:p-16">
          <div className="absolute inset-0 bg-gradient-glow" />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            
            {/* LEFT CONTENT */}
            <div className="space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/30 backdrop-blur-md border border-primary/30 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
                For verified university students
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05]">
                Buy. Sell. <span className="text-gradient">Share.</span>
                <br />Learn together.
              </h1>

              <p className="text-base md:text-lg text-muted-foreground max-w-md">
                The smartest way to exchange academic projects, source code, and study notes within your university community.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow text-base">
                  <Link to="/browse">
                    Explore now <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="text-base border-primary/30 hover:bg-primary/10">
                  <Link to="/upload">
                    <Upload className="mr-1 h-4 w-4" /> List a project
                  </Link>
                </Button>
              </div>
            </div>

            {/* RIGHT IMAGE */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />

              <img
                src={heroImg}
                alt="student working"
                className="relative rounded-2xl shadow-elevated w-full h-[420px] object-cover object-center transition-transform duration-300 hover:scale-105"
              />
            </div>

          </div>
        </section>

        {/* FEATURED */}
        {featured.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                Featured listings
              </h2>

              <Button asChild variant="ghost" size="sm">
                <Link to="/browse">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        {/* CATEGORIES */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            Top categories
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Link
                key={cat.key}
                to={`/browse?category=${cat.key}`}
                className="glow-card rounded-2xl p-5 flex items-center gap-4 group"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-primary/20 flex items-center justify-center group-hover:bg-gradient-primary group-hover:shadow-glow transition-all">
                  <cat.icon className="h-5 w-5 text-primary-glow group-hover:text-primary-foreground" />
                </div>

                <div className="text-sm font-medium">{cat.label}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: ShieldCheck,
              title: "University verified",
              desc: "Only students with a valid academic email can sign up.",
            },
            {
              icon: MessageSquare,
              title: "Real-time chat",
              desc: "Negotiate, ask questions and share details instantly.",
            },
            {
              icon: Sparkles,
              title: "Curated content",
              desc: "Final-year projects, code, notes and study material in one place.",
            },
          ].map((f) => (
            <div key={f.title} className="glow-card rounded-2xl p-6 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>

              <h3 className="font-display font-semibold text-lg">
                {f.title}
              </h3>

              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>

      </div>
    </AppShell>
  );
}
