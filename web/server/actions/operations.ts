"use server";
/**
 * Server actions for the frontend. Each one authenticates, resolves the
 * caller's membership in `organizationId` server-side and delegates to a
 * service. Authorization lives in services + RLS, never in the client.
 */
import { z } from "zod";
import { getActivityTimeline as getActivityTimelineSvc } from "../services/activity";
import {
  approveAction as approveActionSvc,
  cancelApproval as cancelApprovalSvc,
  getApprovals as getApprovalsSvc,
  rejectAction as rejectActionSvc,
  requestApproval as requestApprovalSvc,
} from "../services/approvals";
import { getDashboardSummary as getDashboardSummarySvc } from "../services/dashboard";
import {
  createEvidenceUpload as createEvidenceUploadSvc,
  getEvidenceDownloadUrl as getEvidenceDownloadUrlSvc,
  listEvidence as listEvidenceSvc,
  reviewEvidence as reviewEvidenceSvc,
  submitUploadedEvidence as submitEvidenceSvc,
} from "../services/evidence";
import {
  acknowledgeException as acknowledgeExceptionSvc,
  assignException as assignExceptionSvc,
  getExceptions as getExceptionsSvc,
  reportIssue as reportIssueSvc,
  resolveException as resolveExceptionSvc,
} from "../services/exceptions";
import { getEmployees as getEmployeesSvc } from "../services/members";

import { getNotifications as getNotificationsSvc, markNotificationsRead as markNotificationsReadSvc } from "../services/notifications";
import {
  getOrderDetails as getOrderDetailsSvc,
  getOrders as getOrdersSvc,
  getOrdersAtRisk as getOrdersAtRiskSvc,
  transitionOrder as transitionOrderSvc,
} from "../services/orders";
import { confirmItems as confirmItemsSvc, confirmPackage as confirmPackageSvc, retrieveLabel as retrieveLabelSvc, verifyLabel as verifyLabelSvc } from "../services/packing";
import { prepareShipment as prepareShipmentSvc } from "../services/shipping";
import {
  assignTask as assignTaskSvc,
  completeTask as completeTaskSvc,
  getEmployeeTasks as getEmployeeTasksSvc,
  getEmployeeToday as getEmployeeTodaySvc,
  getTaskDetail as getTaskDetailSvc,
  startNextTask as startNextTaskSvc,
  startTask as startTaskSvc,
  verifyTask as verifyTaskSvc,
} from "../services/tasks";
import { getWorkspaceProfile as getWorkspaceProfileSvc, toExceptionCard, toPrototypeDashboard } from "../adapters/prototype";
import { getSessionUserId } from "../auth/session";
import { getMyOrganizations } from "../services/members";
import { memberAction, toActionError } from "./result";

type In<F> = F extends (ctx: never, input: infer I, ...rest: never[]) => unknown ? I : never;
const uuid = z.string().uuid();

// Dashboard & orders
export async function getDashboardSummary(organizationId: string) {
  return memberAction(organizationId, (ctx) => getDashboardSummarySvc(ctx));
}
export async function getOrders(organizationId: string, query: In<typeof getOrdersSvc> = {}) {
  return memberAction(organizationId, (ctx) => getOrdersSvc(ctx, query));
}
export async function getOrderDetails(organizationId: string, orderId: string) {
  return memberAction(organizationId, (ctx) => getOrderDetailsSvc(ctx, orderId));
}
export async function getOrdersAtRisk(organizationId: string, withinHours?: number) {
  return memberAction(organizationId, (ctx) => getOrdersAtRiskSvc(ctx, { withinHours }));
}
export async function transitionOrder(organizationId: string, input: In<typeof transitionOrderSvc>) {
  return memberAction(organizationId, (ctx) => transitionOrderSvc(ctx, input));
}
export async function prepareShipment(organizationId: string, input: In<typeof prepareShipmentSvc>) {
  return memberAction(organizationId, (ctx) => prepareShipmentSvc(ctx, input));
}

// Tasks & employee mode
export async function getEmployeeTasks(organizationId: string, query: In<typeof getEmployeeTasksSvc> = {}) {
  return memberAction(organizationId, (ctx) => getEmployeeTasksSvc(ctx, query));
}
export async function getEmployeeToday(organizationId: string) {
  return memberAction(organizationId, (ctx) => getEmployeeTodaySvc(ctx));
}
export async function getTaskDetail(organizationId: string, taskId: string) {
  return memberAction(organizationId, (ctx) => getTaskDetailSvc(ctx, taskId));
}
export async function startNextTask(organizationId: string) {
  return memberAction(organizationId, (ctx) => startNextTaskSvc(ctx));
}
export async function startTask(organizationId: string, taskId: string) {
  return memberAction(organizationId, (ctx) => startTaskSvc(ctx, taskId));
}
export async function confirmItems(organizationId: string, input: In<typeof confirmItemsSvc>) {
  return memberAction(organizationId, (ctx) => confirmItemsSvc(ctx, input));
}
export async function retrieveLabel(organizationId: string, taskId: string) {
  return memberAction(organizationId, (ctx) => retrieveLabelSvc(ctx, taskId));
}
export async function verifyLabel(organizationId: string, input: In<typeof verifyLabelSvc>) {
  return memberAction(organizationId, (ctx) => verifyLabelSvc(ctx, input));
}
export async function confirmPackage(organizationId: string, taskId: string) {
  return memberAction(organizationId, (ctx) => confirmPackageSvc(ctx, taskId));
}
export async function completeTask(organizationId: string, taskId: string) {
  return memberAction(organizationId, (ctx) => completeTaskSvc(ctx, taskId));
}
export async function verifyTask(organizationId: string, input: In<typeof verifyTaskSvc>) {
  return memberAction(organizationId, (ctx) => verifyTaskSvc(ctx, input));
}
export async function assignTask(organizationId: string, taskId: string, assigneeId: string | null, reason?: string) {
  return memberAction(organizationId, (ctx) => assignTaskSvc(ctx, uuid.parse(taskId), assigneeId === null ? null : uuid.parse(assigneeId), reason));
}

// Evidence
export async function createEvidenceUpload(organizationId: string, input: In<typeof createEvidenceUploadSvc>) {
  return memberAction(organizationId, (ctx) => createEvidenceUploadSvc(ctx, input));
}
export async function submitEvidence(organizationId: string, input: In<typeof submitEvidenceSvc>) {
  return memberAction(organizationId, (ctx) => submitEvidenceSvc(ctx, input));
}
export async function reviewEvidence(organizationId: string, input: In<typeof reviewEvidenceSvc>) {
  return memberAction(organizationId, (ctx) => reviewEvidenceSvc(ctx, input));
}
export async function listEvidence(organizationId: string, query: In<typeof listEvidenceSvc> = {}) {
  return memberAction(organizationId, (ctx) => listEvidenceSvc(ctx, query));
}
export async function getEvidenceDownloadUrl(organizationId: string, evidenceId: string) {
  return memberAction(organizationId, (ctx) => getEvidenceDownloadUrlSvc(ctx, evidenceId));
}

// Exceptions
export async function getExceptions(organizationId: string, query: In<typeof getExceptionsSvc> = {}) {
  return memberAction(organizationId, (ctx) => getExceptionsSvc(ctx, query));
}
export async function resolveException(organizationId: string, input: In<typeof resolveExceptionSvc>) {
  return memberAction(organizationId, (ctx) => resolveExceptionSvc(ctx, input));
}
export async function acknowledgeException(organizationId: string, exceptionId: string) {
  return memberAction(organizationId, (ctx) => acknowledgeExceptionSvc(ctx, uuid.parse(exceptionId)));
}
export async function assignException(organizationId: string, exceptionId: string, assigneeId: string) {
  return memberAction(organizationId, (ctx) => assignExceptionSvc(ctx, uuid.parse(exceptionId), uuid.parse(assigneeId)));
}
export async function reportIssue(organizationId: string, input: In<typeof reportIssueSvc>) {
  return memberAction(organizationId, (ctx) => reportIssueSvc(ctx, input));
}

// Approvals
export async function requestApproval(organizationId: string, input: In<typeof requestApprovalSvc>) {
  return memberAction(organizationId, (ctx) => requestApprovalSvc(ctx, input));
}
export async function approveAction(organizationId: string, input: In<typeof approveActionSvc>) {
  return memberAction(organizationId, (ctx) => approveActionSvc(ctx, input));
}
export async function rejectAction(organizationId: string, input: In<typeof rejectActionSvc>) {
  return memberAction(organizationId, (ctx) => rejectActionSvc(ctx, input));
}
export async function cancelApproval(organizationId: string, approvalId: string, comment?: string) {
  return memberAction(organizationId, (ctx) => cancelApprovalSvc(ctx, approvalId, comment));
}
export async function getApprovals(organizationId: string, query: In<typeof getApprovalsSvc> = {}) {
  return memberAction(organizationId, (ctx) => getApprovalsSvc(ctx, query));
}

// Notifications, activity, people
export async function getNotifications(organizationId: string, query: In<typeof getNotificationsSvc> = {}) {
  return memberAction(organizationId, (ctx) => getNotificationsSvc(ctx, query));
}
export async function markNotificationsRead(organizationId: string, ids: string[] | "all") {
  return memberAction(organizationId, (ctx) => markNotificationsReadSvc(ctx, ids === "all" ? "all" : z.array(uuid).max(200).parse(ids)));
}
export async function getActivityTimeline(organizationId: string, query: In<typeof getActivityTimelineSvc>) {
  return memberAction(organizationId, (ctx) => getActivityTimelineSvc(ctx, query));
}
export async function getEmployees(organizationId: string) {
  return memberAction(organizationId, (ctx) => getEmployeesSvc(ctx));
}

// Prototype adapters (exact shapes the approved UI already renders)
export async function getWorkspaceProfile(organizationId: string) {
  return memberAction(organizationId, (ctx) => getWorkspaceProfileSvc(ctx));
}
export async function getPrototypeDashboard(organizationId: string) {
  return memberAction(organizationId, async (ctx) => toPrototypeDashboard(await getDashboardSummarySvc(ctx), await getExceptionsSvc(ctx, { limit: 6 }), ctx.now()));
}
export async function getExceptionCenter(organizationId: string) {
  return memberAction(organizationId, async (ctx) => {
    const list = await getExceptionsSvc(ctx, { limit: 100 });
    return list.map((e) => toExceptionCard(e, ctx.permissions.has("exceptions.resolve"), ctx.now()));
  });
}
export async function getMyOrganizationsAction() {
  try {
    return { ok: true as const, data: await getMyOrganizations(await getSessionUserId()) };
  } catch (err) {
    return toActionError(err);
  }
}

// Fulfillment UI entry points derive the active tenant on the server.
export async function lookupPackageAction(input: unknown) {
  try {
    const { getWorkspace } = await import("../auth/workspace");
    const { lookupSessionPackages } = await import("../adapters/fulfillment");
    const { client, workspace } = await getWorkspace();
    return { ok: true as const, data: await lookupSessionPackages(client, workspace, input) };
  } catch (error) { return toActionError(error); }
}
export async function fulfillmentAction(input: unknown) {
  try {
    const schema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("startNext") }).strict(),
      z.object({ action: z.literal("start"), taskId: uuid }).strict(),
      z.object({ action: z.literal("items"), taskId: uuid, items: z.array(z.object({ orderItemId: uuid, quantity: z.number().int().min(0).max(10000) }).strict()).min(1) }).strict(),
      z.object({ action: z.literal("label"), taskId: uuid }).strict(),
      z.object({ action: z.literal("scan"), taskId: uuid, scannedValue: z.string().trim().min(1).max(200) }).strict(),
      z.object({ action: z.literal("package"), taskId: uuid }).strict(),
      z.object({ action: z.literal("complete"), taskId: uuid }).strict(),
      z.object({ action: z.literal("assign"), taskId: uuid, assigneeId: uuid.nullable() }).strict(),
    ]);
    const command = schema.parse(input);
    const { getWorkspace } = await import("../auth/workspace");
    const { workspace } = await getWorkspace();
    return memberAction(workspace.profile.organization.id, async (ctx) => {
      switch (command.action) {
        case "startNext": return { task: await startNextTaskSvc(ctx) };
        case "start": await startTaskSvc(ctx, command.taskId); return { message: "Packing started." };
        case "items": {
          const result = await confirmItemsSvc(ctx, { taskId: command.taskId, items: command.items });
          return { passed: result.passed, message: result.passed ? "Products and quantities verified." : result.problems.join("; ") };
        }
        case "label": await retrieveLabelSvc(ctx, command.taskId); return { message: "Assigned label retrieved. Attach it to this package, then scan it." };
        case "scan": {
          const result = await verifyLabelSvc(ctx, { taskId: command.taskId, scannedValue: command.scannedValue });
          return { passed: result.passed, message: result.instruction };
        }
        case "package": await confirmPackageSvc(ctx, command.taskId); return { message: "Package confirmed. Submit for final verification." };
        case "complete": return completeTaskSvc(ctx, command.taskId);
        case "assign": await assignTaskSvc(ctx, command.taskId, command.assigneeId, "Assigned through order fulfillment"); return { message: "Employee responsibility updated." };
      }
    });
  } catch (error) { return toActionError(error); }
}

/** Actual photo upload, scoped to the working employee's task before using Storage. */
export async function uploadPackingEvidence(form: FormData) {
  try {
    const taskId = uuid.parse(form.get("taskId"));
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 15 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      return { ok: false as const, error: { code: "VALIDATION_FAILED" as const, message: "Choose a package photo (JPEG, PNG, WEBP or HEIC), up to 15 MB." } };
    }
    const { getWorkspace } = await import("../auth/workspace");
    const { workspace } = await getWorkspace();
    return memberAction(workspace.profile.organization.id, async (ctx) => {
      const task = await getTaskDetailSvc(ctx, taskId);
      // getTaskDetail is RLS-scoped; the upload service also validates assignment.
      const uploaded = await createEvidenceUploadSvc(ctx, { taskId, fileName: file.name, contentType: file.type as "image/jpeg" });
      const response = await fetch(uploaded.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file, cache: "no-store" });
      if (!response.ok) throw new Error("Evidence upload failed");
      await submitEvidenceSvc(ctx, { taskId: task.id, evidenceType: "PACKAGING_PHOTO", storagePath: uploaded.storagePath, contentType: file.type as "image/jpeg", sizeBytes: file.size });
      return { message: "Package photo uploaded. Evidence awaits human review." };
    });
  } catch (error) { return toActionError(error); }
}
