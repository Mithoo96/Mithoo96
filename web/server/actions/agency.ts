"use server";
import { z } from "zod";
import { memberAction } from "./result";
import * as agency from "../services/agency/foundation";
import { getAgencyWorkspace } from "../services/agency/workspace";
import { getWorkspaceProfile } from "../adapters/prototype";
import {
  contactSchema,
  leadSchema,
  moduleConfigurationSchema,
  followUpSchema,
  stageSchema,
} from "@/core/agency/modules";
export async function agencyWorkspace(org: string) {
  return memberAction(org, async (ctx) => ({
    profile: await getWorkspaceProfile(ctx),
    workspace: await getAgencyWorkspace(ctx),
  }));
}
export async function configureAgency(
  org: string,
  input: z.input<typeof moduleConfigurationSchema>,
) {
  return memberAction(org, (ctx) => agency.configureModules(ctx, input));
}
export async function configurePipelineStage(
  org: string,
  input: z.input<typeof stageSchema>,
) {
  return memberAction(org, (ctx) => agency.configureStage(ctx, input));
}
export async function captureAgencyLead(
  org: string,
  input: z.input<typeof leadSchema>,
) {
  return memberAction(org, (ctx) => agency.createLead(ctx, input));
}
export async function captureAgencyContactLead(
  org: string,
  contact: z.input<typeof contactSchema>,
  input: Omit<z.input<typeof leadSchema>, "customerId">,
) {
  return memberAction(org, async (ctx) =>
    agency.createLead(ctx, {
      ...input,
      customerId: await agency.createContact(ctx, contact),
    }),
  );
}
export async function assignAgencyLead(
  org: string,
  id: string,
  userId: string,
) {
  return memberAction(org, (ctx) => agency.assignLead(ctx, id, userId));
}
export async function moveAgencyLead(org: string, id: string, stageId: string) {
  return memberAction(org, (ctx) => agency.moveLead(ctx, id, stageId));
}
export async function followUpAgencyLead(
  org: string,
  input: z.input<typeof followUpSchema>,
) {
  return memberAction(org, (ctx) => agency.scheduleFollowUp(ctx, input));
}
export async function completeAgencyFollowUp(
  org: string,
  taskId: string,
  outcome: "CONTACTED" | "NO_RESPONSE",
) {
  return memberAction(org, (ctx) =>
    agency.finishFollowUp(ctx, taskId, outcome),
  );
}
export async function convertAgencyLead(org: string, id: string) {
  return memberAction(org, (ctx) => agency.convertLead(ctx, id));
}
export async function assignAgencyClient(
  org: string,
  id: string,
  userId: string,
  active = true,
) {
  return memberAction(org, (ctx) =>
    agency.assignClient(ctx, id, userId, active),
  );
}
export async function agencyLeadTimeline(org: string, id: string) {
  return memberAction(org, (ctx) => agency.leadTimeline(ctx, id));
}
export async function agencyClientTimeline(org: string, id: string) {
  return memberAction(org, (ctx) => agency.clientTimeline(ctx, id));
}
