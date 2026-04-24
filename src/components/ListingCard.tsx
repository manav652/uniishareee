import { Link } from "react-router-dom";
import { Heart, Eye, Tag } from "lucide-react";
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";

export interface ListingCardData {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: CategoryKey;
  listing_type: "sale" | "free";
  images: string[];
  views: number;
  status?: "active" | "sold" | "archived";
  seller?: { full_name: string; branch?: string | null } | null;
}

export function ListingCard({ listing, onFavorite, isFavorite }: {
  listing: ListingCardData;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}) {
  const category = CATEGORY_MAP[listing.category];
  const cover = listing.images?.[0];

  return (
    <Link to={`/listing/${listing.id}`} className="glow-card rounded-2xl overflow-hidden group block">
      <div className="relative aspect-[4/3] bg-gradient-hero overflow-hidden">
        {cover ? (
          <img src={cover} alt={listing.title} loading="lazy" className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${listing.status === "sold" ? "opacity-50 grayscale" : ""}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-foreground/40">
            <category.icon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge className={listing.status === "sold" ? "bg-destructive text-destructive-foreground" : listing.listing_type === "free" ? "bg-success text-background" : "bg-primary/90 backdrop-blur-sm"}>
            {listing.status === "sold" ? "SOLD OUT" : listing.listing_type === "free" ? "FREE" : "FOR SALE"}
          </Badge>
        </div>
        {listing.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display font-bold text-2xl text-destructive-foreground bg-destructive/80 px-4 py-1 rounded-md rotate-[-8deg] shadow-lg">SOLD</span>
          </div>
        )}
        {onFavorite && listing.status !== "sold" && (
          <button
            onClick={(e) => { e.preventDefault(); onFavorite(listing.id); }}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/40 backdrop-blur-md flex items-center justify-center hover:bg-background/60 transition-colors"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <category.icon className="h-3.5 w-3.5" />
          {category.label}
        </div>
        <h3 className="font-display font-semibold text-base line-clamp-1">{listing.title}</h3>
        {listing.seller && (
          <p className="text-xs text-muted-foreground">by {listing.seller.full_name}</p>
        )}
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-xs text-muted-foreground">{listing.listing_type === "free" ? "Price" : "Asking"}</div>
            <div className="text-lg font-display font-bold text-gradient">
              {listing.listing_type === "free" ? "Free" : `₹${Number(listing.price).toLocaleString("en-IN")}`}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {listing.views}
          </div>
        </div>
      </div>
    </Link>
  );
}
