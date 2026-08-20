import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";

const STATUS_LABEL: Record<ContentStatus, string> = {
  collected: "coletado",
  transcribing: "transcrevendo",
  analyzing: "analisando",
  done: "pronto",
  error: "erro",
};

const STATUS_CLASS: Record<ContentStatus, string> = {
  collected: "bg-muted text-muted-foreground",
  transcribing: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  analyzing: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  error: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
