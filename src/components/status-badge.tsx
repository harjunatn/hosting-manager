import { Badge } from "@/components/ui/badge";
import type { EffectiveInvoiceStatus } from "@/modules/subscriptions/status";
import type { EffectiveSubscriptionStatus } from "@/modules/subscriptions/status";
import type {
  ClientStatus,
  EmailDeliveryStatus,
  HostingStatus,
  PaymentStatus,
} from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusValue =
  | EffectiveSubscriptionStatus
  | EffectiveInvoiceStatus
  | PaymentStatus
  | EmailDeliveryStatus
  | ClientStatus
  | HostingStatus;

const colorByStatus: Record<StatusValue, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-slate-100 text-slate-600",
  EXPIRING: "bg-amber-100 text-amber-800",
  PAYMENT_DUE: "bg-sky-100 text-sky-800",
  EXPIRED: "bg-rose-100 text-rose-800",
  CANCELLED: "bg-slate-100 text-slate-600",
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-indigo-100 text-indigo-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  VOID: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_VERIFICATION: "bg-orange-100 text-orange-800",
  REJECTED: "bg-rose-100 text-rose-800",
  QUEUED: "bg-slate-100 text-slate-600",
  DELIVERED: "bg-sky-100 text-sky-800",
  OPENED: "bg-emerald-100 text-emerald-800",
  BOUNCED: "bg-rose-100 text-rose-800",
  FAILED: "bg-rose-100 text-rose-800",
  COMPLAINED: "bg-orange-100 text-orange-800",
  SUPPRESSED: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ value }: { value: StatusValue }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 border-transparent px-2.5 text-[11px] tracking-wide",
        colorByStatus[value],
      )}
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
