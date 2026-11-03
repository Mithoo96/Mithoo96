import { z } from "zod";
export const AGENCY_MODULES = [
  "TAX",
  "LIFE_INSURANCE",
  "HEALTH_INSURANCE",
] as const;
export type AgencyModule = (typeof AGENCY_MODULES)[number];
export const MODULE_LABELS: Record<AgencyModule, string> = {
  TAX: "Tax",
  LIFE_INSURANCE: "Life Insurance",
  HEALTH_INSURANCE: "Health Insurance",
};
export const DEFAULT_STAGES = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "QUALIFIED",
  "APPOINTMENT_SCHEDULED",
  "DOCUMENTS_REQUESTED",
  "DOCUMENTS_RECEIVED",
  "IN_PROGRESS",
  "WAITING_ON_CLIENT",
  "WAITING_ON_TEAM",
  "COMPLETED",
  "LOST",
  "FOLLOW_UP_LATER",
] as const;
export const moduleConfigurationSchema = z
  .object({
    modules: z
      .array(z.enum(AGENCY_MODULES))
      .min(1)
      .max(3)
      .refine((v) => new Set(v).size === v.length, "Duplicate modules"),
  })
  .strict();
export const leadSchema = z
  .object({
    customerId: z.string().uuid(),
    module: z.enum(AGENCY_MODULES),
    source: z.string().trim().min(1).max(100).default("MANUAL"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    assignedTo: z.string().uuid().optional(),
    notes: z.string().trim().max(4000).default(""),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    followUpAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export const followUpSchema = z
  .object({
    leadId: z.string().uuid(),
    requestKey: z.string().uuid(),
    dueAt: z.string().datetime({ offset: true }),
    title: z.string().trim().min(3).max(200).default("Follow up with prospect"),
  })
  .strict();
export const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.email().optional(),
    phone: z.string().trim().min(3).max(40).optional(),
  })
  .strict();
export const stageSchema = z
  .object({
    module: z.enum(AGENCY_MODULES),
    code: z
      .string()
      .regex(/^[A-Z_]+$/)
      .max(80),
    label: z.string().trim().min(1).max(100),
    position: z.number().int().min(0),
    isInitial: z.boolean().default(false),
    isTerminal: z.boolean().default(false),
  })
  .strict();
