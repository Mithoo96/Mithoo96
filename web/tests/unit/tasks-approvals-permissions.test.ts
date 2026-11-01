import { describe, expect, it } from "vitest";
import { canDecideApproval } from "@/core/approvals/rules";
import { canReviewEvidence, isValidEvidencePath } from "@/core/evidence/rules";
import { evaluateTaskCompletion, rankTasksForEmployee, type TaskLike } from "@/core/tasks/rules";
import { resolvePermissions } from "@/core/tenancy/permissions";
import { verifyTimestampedHmac, hmacSha256Hex } from "@/integrations/webhooks/signature";

const task = (o: Partial<TaskLike> = {}): TaskLike => ({
  id: "t1", status: "IN_PROGRESS", assignedTo: "u1", priority: "NORMAL", dueAt: null, createdAt: new Date(0),
  requiredChecks: ["ITEMS_CONFIRMED", "LABEL_SCANNED"], requiredEvidence: ["PACKAGING_PHOTO"], checksState: {}, ...o,
});
const passed = { passed: true, at: "x", by: "u1" };

describe("task completion", () => {
  it("refuses completion when validation or evidence is missing", () => {
    const r = evaluateTaskCompletion(task({ checksState: { ITEMS_CONFIRMED: passed } }), { userId: "u1", submittedEvidenceTypes: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["check:LABEL_SCANNED", "evidence:PACKAGING_PHOTO"]);
  });
  it("treats a failed check as missing", () => {
    const r = evaluateTaskCompletion(task({ checksState: { ITEMS_CONFIRMED: passed, LABEL_SCANNED: { ...passed, passed: false } } }), { userId: "u1", submittedEvidenceTypes: ["PACKAGING_PHOTO"] });
    expect(r.ok).toBe(false);
  });
  it("completes when everything is present, only for the assignee", () => {
    const t = task({ checksState: { ITEMS_CONFIRMED: passed, LABEL_SCANNED: passed } });
    expect(evaluateTaskCompletion(t, { userId: "u1", submittedEvidenceTypes: ["PACKAGING_PHOTO"] }).ok).toBe(true);
    expect(evaluateTaskCompletion(t, { userId: "u2", submittedEvidenceTypes: ["PACKAGING_PHOTO"] }).ok).toBe(false);
  });
  it("ranks in-progress first, then priority", () => {
    const ranked = rankTasksForEmployee(
      [task({ id: "a", status: "OPEN", priority: "LOW" }), task({ id: "b", status: "OPEN", priority: "URGENT" }), task({ id: "c", status: "IN_PROGRESS" })],
      "u1",
      { includePool: false },
    );
    expect(ranked.map((t) => t.id)).toEqual(["c", "b", "a"]);
  });
});

describe("approval permissions", () => {
  const pending = { status: "PENDING" as const, requestedBy: "emp", approverId: null, requiredRole: "MANAGER" as const, expiresAt: null };
  const actor = (role: "OWNER" | "MANAGER" | "EMPLOYEE", userId = "x") => ({ userId, role, permissions: resolvePermissions(role) });
  it("forbids employees and self-approval", () => {
    expect(canDecideApproval(pending, actor("EMPLOYEE"), new Date()).ok).toBe(false);
    expect(canDecideApproval({ ...pending, requestedBy: "mgr" }, actor("MANAGER", "mgr"), new Date()).ok).toBe(false);
  });
  it("requires owner role for owner-level approvals", () => {
    expect(canDecideApproval({ ...pending, requiredRole: "OWNER" }, actor("MANAGER"), new Date()).ok).toBe(false);
    expect(canDecideApproval({ ...pending, requiredRole: "OWNER" }, actor("OWNER"), new Date()).ok).toBe(true);
    expect(canDecideApproval(pending, actor("MANAGER"), new Date()).ok).toBe(true);
  });
  it("rejects decided or expired requests", () => {
    expect(canDecideApproval({ ...pending, status: "APPROVED" }, actor("OWNER"), new Date()).ok).toBe(false);
    expect(canDecideApproval({ ...pending, expiresAt: new Date(0) }, actor("OWNER"), new Date()).ok).toBe(false);
  });
});

describe("role permissions", () => {
  it("keeps employees away from management data", () => {
    const p = resolvePermissions("EMPLOYEE");
    for (const perm of ["orders.read_all", "customers.read", "revenue.read", "approvals.decide", "exceptions.resolve", "members.read"] as const) expect(p.has(perm)).toBe(false);
    expect(p.has("tasks.work")).toBe(true);
    expect(resolvePermissions("EMPLOYEE", ["customers.read", "bogus.perm"]).has("customers.read")).toBe(true);
    expect(resolvePermissions("MANAGER").has("revenue.read")).toBe(false);
    expect(resolvePermissions("OWNER").has("settings.manage")).toBe(true);
  });
});

describe("evidence rules", () => {
  it("keeps paths inside the tenant folder and blocks self-review", () => {
    expect(isValidEvidencePath("org-a", "org-a/orders/1/photo.jpg")).toBe(true);
    expect(isValidEvidencePath("org-a", "org-b/orders/1/photo.jpg")).toBe(false);
    expect(isValidEvidencePath("org-a", "org-a/../org-b/x.jpg")).toBe(false);
    expect(canReviewEvidence({ submittedBy: "u1", reviewStatus: "PENDING_REVIEW" }, "u1").ok).toBe(false);
  });
});

describe("webhook signatures", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const ts = String(Math.floor(now.getTime() / 1000));
  it("accepts valid and rejects tampered, stale or missing signatures", () => {
    const sig = hmacSha256Hex("secret", `${ts}.{"a":1}`);
    expect(verifyTimestampedHmac({ secret: "secret", rawBody: '{"a":1}', signature: sig, timestamp: ts, now }).valid).toBe(true);
    expect(verifyTimestampedHmac({ secret: "secret", rawBody: '{"a":2}', signature: sig, timestamp: ts, now }).valid).toBe(false);
    expect(verifyTimestampedHmac({ secret: "secret", rawBody: '{"a":1}', signature: sig, timestamp: String(Number(ts) - 3600), now }).valid).toBe(false);
    expect(verifyTimestampedHmac({ secret: "secret", rawBody: "{}", signature: undefined, timestamp: ts, now }).valid).toBe(false);
  });
});
