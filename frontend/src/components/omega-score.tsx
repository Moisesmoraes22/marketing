import { cn } from "@/lib/utils";
import { RECOMMENDATION_META, type Recommendation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function scoreClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function OmegaScore({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={cn("font-semibold tabular-nums", sizeClass, scoreClass(score), className)}>
      {score}
      <span className="text-muted-foreground font-normal">/100</span>
    </span>
  );
}

export function RecommendationBadge({
  recommendation,
  className,
}: {
  recommendation: Recommendation;
  className?: string;
}) {
  const meta = RECOMMENDATION_META[recommendation];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", meta.className, className)}>
      {meta.emoji} {meta.label}
    </Badge>
  );
}
