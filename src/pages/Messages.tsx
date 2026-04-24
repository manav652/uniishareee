import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function MessagesInner() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select(`
          id, last_message_at, listing_id,
          listing:listings(id, title, images),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      setConversations(data ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <AppShell>
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Chat with buyers and sellers in real time.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : conversations.length === 0 ? (
          <div className="glow-card rounded-2xl p-12 text-center space-y-3">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No conversations yet. Start one from any listing.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const other = c.buyer.id === user?.id ? c.seller : c.buyer;
              return (
                <Link key={c.id} to={`/messages/${c.id}`}
                  className="glow-card rounded-2xl p-4 flex items-center gap-4 group">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {other?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold truncate">{other?.full_name}</div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {c.last_message_at && formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">Re: {c.listing?.title}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function Messages() {
  return <ProtectedRoute><MessagesInner /></ProtectedRoute>;
}
