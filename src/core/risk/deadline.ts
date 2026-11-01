/**
 * Generic deadline evaluation. Knows nothing about TikTok or any platform:
 * platform adapters supply the deadline (e.g. ship_by_at) and organizations
 * configure the escalation policy via system_settings.
 */
import { z } from "zod";
import { SEVERITIES, type Severity } from "../severity";

export const deadlinePolicySchema = z
  .object({
    /** Escalation steps; the tightest window that contains "now" wins. */
    thresholds: z
      .array(z.object({ withinMinutes: z.number().int().positive(), severity: z.enum(SEVERITIES) }))
      .min(1),
    overdueSeverity: z.enum(SEVERITIES),
  })
  .strict();

export type DeadlinePolicy = z.infer<typeof deadlinePolicySchema>;

export const DEFAULT_SHIPPING_DEADLINE_POLICY: DeadlinePolicy = {
  thresholds: [
    { withinMinutes: 24 * 60, severity: "LOW" },
    { withinMinutes: 8 * 60, severity: "MEDIUM" },
    { withinMinutes: 4 * 60, severity: "HIGH" },
    { withinMinutes: 60, severity: "CRITICAL" },
  ],
  overdueSeverity: "CRITICAL",
};

export type DeadlineState = "NO_DEADLINE" | "SATISFIED" | "OK" | "APPROACHING" | "OVERDUE";

export interface DeadlineEvaluation {
  readonly state: DeadlineState;
  readonly severity: Severity | null;
  readonly minutesRemaining: number | null;
}

export function evaluateDeadline(input: {
  deadlineAt: Date | null;
  now: Date;
  policy: DeadlinePolicy;
  /** True when the work the deadline guards is already done. */
  satisfied: boolean;
}): DeadlineEvaluation {
  const { deadlineAt, now, policy, satisfied } = input;
  if (!deadlineAt) return { state: "NO_DEADLINE", severity: null, minutesRemaining: null };
  const minutesRemaining = Math.floor((deadlineAt.getTime() - now.getTime()) / 60_000);
  if (satisfied) return { state: "SATISFIED", severity: null, minutesRemaining };
  if (minutesRemaining < 0) return { state: "OVERDUE", severity: policy.overdueSeverity, minutesRemaining };

  const matching = [...policy.thresholds]
    .sort((a, b) => a.withinMinutes - b.withinMinutes)
    .find((t) => minutesRemaining <= t.withinMinutes);
  if (!matching) return { state: "OK", severity: null, minutesRemaining };
  return { state: "APPROACHING", severity: matching.severity, minutesRemaining };
}

/** Parse a stored policy, falling back to the default when invalid. */
export function parseDeadlinePolicy(value: unknown, fallback: DeadlinePolicy = DEFAULT_SHIPPING_DEADLINE_POLICY): DeadlinePolicy {
  const parsed = deadlinePolicySchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
