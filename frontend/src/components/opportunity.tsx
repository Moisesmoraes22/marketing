import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_META,
  RECOMMENDATION_META,
  RISK_META,
  type OpportunityLevel,
  type Recommendation,
  type RiskLevel,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function OpportunityBadge({
  level,
  className,
}: {
  level: OpportunityLevel;
  className?: string;
}) {
  const meta = OPPORTUNITY_META[level];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-transparent font-medium", meta.className, className)}
    >
      {meta.emoji} {meta.label.toUpperCase()}
    </Badge>
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

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  const meta = RISK_META[level];
  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      {meta.emoji} Risco: {meta.label}
    </Badge>
  );
}
