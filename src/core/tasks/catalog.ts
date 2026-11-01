/**
 * Task Engine catalog. Each task type defines plain-language instructions for
 * employees (no platform knowledge required), the checks the system must see
 * before completion, and default priority/SLA.
 */
export const TASK_TYPES = [
  "PACK_ORDER",
  "REPRINT_LABEL",
  "HAND_TO_CARRIER",
  "RESOLVE_EXCEPTION",
  "CUSTOMER_FOLLOW_UP",
  "GENERIC",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "AWAITING_VERIFICATION", "COMPLETED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const LIVE_TASK_STATUSES: readonly TaskStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED", "AWAITING_VERIFICATION"];

export const TASK_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export const TASK_CHECKS = [
  "ITEMS_CONFIRMED",
  "LABEL_RETRIEVED",
  "LABEL_SCANNED",
  "PACKAGE_CONFIRMED",
  "HANDOVER_CONFIRMED",
] as const;
export type TaskCheck = (typeof TASK_CHECKS)[number];

export interface InstructionStep {
  readonly key: string;
  readonly text: string;
  /** The system check that proves this step happened, if any. */
  readonly check: TaskCheck | null;
}

export interface TaskTypeDefinition {
  readonly title: (ctx: { orderNumber?: string }) => string;
  readonly instructions: readonly InstructionStep[];
  readonly requiredChecks: readonly TaskCheck[];
  readonly defaultPriority: TaskPriority;
  /** Default time allowed from creation, in minutes. */
  readonly defaultDueMinutes: number;
  readonly employeeVisible: boolean;
}

export const TASK_CATALOG: Readonly<Record<TaskType, TaskTypeDefinition>> = {
  PACK_ORDER: {
    title: ({ orderNumber }) => `Pack order ${orderNumber ?? ""}`.trim(),
    instructions: [
      { key: "locate", text: "Locate the products listed below at their bin locations.", check: null },
      { key: "quantities", text: "Verify each product and quantity matches the list.", check: "ITEMS_CONFIRMED" },
      { key: "label", text: "Print or retrieve the assigned shipping label.", check: "LABEL_RETRIEVED" },
      { key: "pack", text: "Pack the products securely and attach the label.", check: null },
      { key: "scan", text: "Scan the label on the package.", check: "LABEL_SCANNED" },
      { key: "confirm", text: "Take the packaging photo and confirm the package.", check: "PACKAGE_CONFIRMED" },
    ],
    requiredChecks: ["ITEMS_CONFIRMED", "LABEL_RETRIEVED", "LABEL_SCANNED", "PACKAGE_CONFIRMED"],
    defaultPriority: "NORMAL",
    defaultDueMinutes: 240,
    employeeVisible: true,
  },
  REPRINT_LABEL: {
    title: ({ orderNumber }) => `Replace label on order ${orderNumber ?? ""}`.trim(),
    instructions: [
      { key: "remove", text: "Find the package and remove the old label completely.", check: null },
      { key: "label", text: "Print the new label shown on screen.", check: "LABEL_RETRIEVED" },
      { key: "scan", text: "Attach and scan the new label.", check: "LABEL_SCANNED" },
      { key: "confirm", text: "Confirm the package.", check: "PACKAGE_CONFIRMED" },
    ],
    requiredChecks: ["LABEL_RETRIEVED", "LABEL_SCANNED", "PACKAGE_CONFIRMED"],
    defaultPriority: "HIGH",
    defaultDueMinutes: 60,
    employeeVisible: true,
  },
  HAND_TO_CARRIER: {
    title: ({ orderNumber }) => `Hand order ${orderNumber ?? ""} to the carrier`.trim(),
    instructions: [
      { key: "collect", text: "Bring the verified package to the carrier drop-off or pickup point.", check: null },
      { key: "receipt", text: "Get a carrier receipt or acceptance scan and photograph it.", check: null },
      { key: "confirm", text: "Confirm the handover.", check: "HANDOVER_CONFIRMED" },
    ],
    requiredChecks: ["HANDOVER_CONFIRMED"],
    defaultPriority: "NORMAL",
    defaultDueMinutes: 480,
    employeeVisible: true,
  },
  RESOLVE_EXCEPTION: {
    title: () => "Resolve operational exception",
    instructions: [{ key: "review", text: "Review the exception and follow the recommended action.", check: null }],
    requiredChecks: [],
    defaultPriority: "HIGH",
    defaultDueMinutes: 120,
    employeeVisible: false,
  },
  CUSTOMER_FOLLOW_UP: {
    title: ({ orderNumber }) => `Follow up with customer on ${orderNumber ?? "order"}`,
    instructions: [{ key: "reply", text: "Reply to the customer on the sales platform and record the outcome.", check: null }],
    requiredChecks: [],
    defaultPriority: "HIGH",
    defaultDueMinutes: 240,
    employeeVisible: false,
  },
  GENERIC: {
    title: () => "Task",
    instructions: [],
    requiredChecks: [],
    defaultPriority: "NORMAL",
    defaultDueMinutes: 1440,
    employeeVisible: true,
  },
};

export const isTaskType = (v: unknown): v is TaskType => typeof v === "string" && (TASK_TYPES as readonly string[]).includes(v);
export const isTaskCheck = (v: unknown): v is TaskCheck => typeof v === "string" && (TASK_CHECKS as readonly string[]).includes(v);
