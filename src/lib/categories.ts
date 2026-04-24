import { Cpu, Zap, Wrench, Building2, Plug, Briefcase, Palette, Sparkles, type LucideIcon } from "lucide-react";

export type CategoryKey =
  | "computer_science"
  | "electronics"
  | "mechanical"
  | "civil"
  | "electrical"
  | "business"
  | "design"
  | "other";

export const CATEGORIES: { key: CategoryKey; label: string; icon: LucideIcon }[] = [
  { key: "computer_science", label: "Computer Science", icon: Cpu },
  { key: "electronics", label: "Electronics", icon: Zap },
  { key: "mechanical", label: "Mechanical", icon: Wrench },
  { key: "civil", label: "Civil Engineering", icon: Building2 },
  { key: "electrical", label: "Electrical", icon: Plug },
  { key: "business", label: "Business", icon: Briefcase },
  { key: "design", label: "Design", icon: Palette },
  { key: "other", label: "Other", icon: Sparkles },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
