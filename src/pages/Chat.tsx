import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

function ChatInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;

    const load = async () => {
      const { data: c } = await supabase
        .from("conversations")
        .select(`id, listing_id, buyer_id, seller_id,
          listing:listings(id, title, images, price, listing_type),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)`)
        .eq("id", id).maybeSingle();

      if (!c) { navigate("/messages"); return; }
      setConv(c);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);
      setLoading(false);
    };
    load();

    // Realtime messages
    const msgChannel = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    // Presence
    const presence = supabase.channel(`presence:conv:${id}`, { config: { presence: { key: user.id } } });
    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presence.track({ online_at: new Date().toISOString() });
      });

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presence);
    };
  }, [id, user, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user || !id) return;
    setText("");
    await supabase.from("messages").insert({
      conversation_id: id, sender_id: user.id, content: content.slice(0, 1000),
    });
  };

  if (loading || !conv) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }

  const other = conv.buyer.id === user?.id ? conv.seller : conv.buyer;
  const isOnline = onlineUsers.has(other.id);

  return (
    <AppShell>
      <div className="container max-w-4xl py-4 md:py-8 flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-12rem)]">
        {/* Header */}
        <div className="glow-card rounded-2xl p-4 flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-primary/30">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {other.full_name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${isOnline ? "bg-success animate-pulse-glow" : "bg-muted"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{other.full_name}</div>
            <div className="text-xs text-muted-foreground">{isOnline ? "Online now" : "Offline"}</div>
          </div>
          <Link to={`/listing/${conv.listing.id}`} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">
            {conv.listing.images?.[0] && (
              <img src={conv.listing.images[0]} alt="" className="h-8 w-8 rounded object-cover" />
            )}
            <div className="text-xs max-w-[140px]">
              <div className="font-medium truncate">{conv.listing.title}</div>
              <div className="text-muted-foreground">
                {conv.listing.listing_type === "free" ? "Free" : `₹${Number(conv.listing.price).toLocaleString("en-IN")}`}
              </div>
            </div>
          </Link>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Say hi to {other.full_name?.split(" ")[0]} 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  mine ? "bg-gradient-primary text-primary-foreground rounded-br-sm shadow-glow"
                       : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <form onSubmit={send} className="mt-4 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
            placeholder="Type a message..." className="h-12" />
          <Button type="submit" className="h-12 px-5 bg-gradient-primary shadow-glow">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

export default function Chat() {
  return <ProtectedRoute><ChatInner /></ProtectedRoute>;
}
