import { expect, it } from "vitest";
import {
  AGENCY_MODULES,
  DEFAULT_STAGES,
  moduleConfigurationSchema,
  leadSchema,
  followUpSchema,
} from "@/core/agency/modules";
import { resolvePermissions } from "@/core/tenancy/permissions";
import { TASK_CATALOG } from "@/core/tasks/catalog";
it("defines separate tax/life/health modules and validates configuration", () => {
  expect(AGENCY_MODULES).toEqual(["TAX", "LIFE_INSURANCE", "HEALTH_INSURANCE"]);
  expect(
    moduleConfigurationSchema.safeParse({ modules: ["insurance"] }).success,
  ).toBe(false);
  expect(
    moduleConfigurationSchema.safeParse({ modules: ["TAX", "TAX"] }).success,
  ).toBe(false);
  expect(moduleConfigurationSchema.safeParse({ modules: [] }).success).toBe(
    false,
  );
  expect(DEFAULT_STAGES).toHaveLength(13);
});
it("agency employees have scoped work permission without broad customer/assignment rights", () => {
  const p = resolvePermissions("EMPLOYEE");
  expect(p.has("agency.work")).toBe(true);
  expect(p.has("customers.read")).toBe(false);
  expect(p.has("agency.assign")).toBe(false);
  expect(resolvePermissions("MANAGER").has("agency.read_all")).toBe(true);
  expect(resolvePermissions("MANAGER").has("agency.configure")).toBe(false);
});
it("follow-ups use existing task checks and reject malformed requests", () => {
  expect(TASK_CATALOG.AGENCY_FOLLOW_UP.requiredChecks).toEqual([
    "CONTACT_OUTCOME_RECORDED",
  ]);
  expect(
    leadSchema.safeParse({ customerId: "invalid", module: "TAX" }).success,
  ).toBe(false);
  expect(
    followUpSchema.safeParse({
      leadId: crypto.randomUUID(),
      requestKey: crypto.randomUUID(),
      dueAt: "tomorrow",
    }).success,
  ).toBe(false);
});
