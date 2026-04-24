import { GraduationCap } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-lg" },
    md: { box: "h-10 w-10", icon: "h-5 w-5", text: "text-xl" },
    lg: { box: "h-14 w-14", icon: "h-7 w-7", text: "text-3xl" },
  }[size];

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${sizes.box} rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow`}>
        <GraduationCap className={`${sizes.icon} text-primary-foreground`} />
      </div>
      <span className={`${sizes.text} font-display font-bold tracking-tight`}>
        Uni<span className="text-gradient">Share</span>
      </span>
    </div>
  );
}
