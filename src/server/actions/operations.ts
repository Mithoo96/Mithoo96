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
  submitEvidence as submitEvidenceSvc,
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
import { memberAction } from "./result";

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
