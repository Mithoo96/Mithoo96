// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PackingFlow } from "@/components/fulfillment/packing";
import type { EmployeeTaskDetail } from "@/server/services/tasks";
const mocks = vi.hoisted(() => ({ action: vi.fn(), upload: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/actions/operations", () => ({ fulfillmentAction: mocks.action, uploadPackingEvidence: mocks.upload }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }) }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });
function task(passed: string[] = [], status = "IN_PROGRESS"): EmployeeTaskDetail {
  return { id: "task-7", type: "PACK_ORDER", title: "Pack ZB-1007", status, priority: "NORMAL", dueAt: null,
    order: { id: "order-7", orderNumber: "ZB-1007", shipByAt: null, status: "PACKING" },
    items: [{ orderItemId: "item-1", sku: "SKU-1", name: "Product", quantity: 2, binLocation: null, imageUrl: null }],
    label: { carrier: "USPS", trackingLast4: "…0007", ready: true },
    steps: (["ITEMS_CONFIRMED", "LABEL_RETRIEVED", "LABEL_SCANNED", "PACKAGE_CONFIRMED"] as const).map((check) => ({ key: check, text: check, check, done: passed.includes(check), failed: false })), currentStep: null, requiredEvidence: ["PACKAGING_PHOTO"], submittedEvidence: [] };
}
it("keeps shipping-label, package and final verification disabled before product checks", () => {
  render(createElement(PackingFlow, { task: task() }));
  expect((screen.getByRole("button", { name: "Retrieve assigned label" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Confirm verified package" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Submit for final verification" }) as HTMLButtonElement).disabled).toBe(true);
});
it("submits the employee's actual counted quantities and shows mismatches", async () => {
  mocks.action.mockResolvedValue({ ok: true, data: { passed: false, message: "Expected 2, counted 1" } });
  render(createElement(PackingFlow, { task: task() }));
  fireEvent.change(screen.getByLabelText("Counted SKU-1"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify products" }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({ action: "items", taskId: "task-7", items: [{ orderItemId: "item-1", quantity: 1 }] }));
  expect((await screen.findByRole("alert")).textContent).toContain("counted 1");
});
it("shows STOP on a failed full label scan and never enables package completion", async () => {
  mocks.action.mockResolvedValue({ ok: true, data: { passed: false, message: "STOP — do not ship this package." } });
  render(createElement(PackingFlow, { task: task(["ITEMS_CONFIRMED", "LABEL_RETRIEVED"]) }));
  fireEvent.change(screen.getByLabelText("Scan full tracking / barcode / QR value"), { target: { value: "wrong-label-0008" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify label scan" }));
  expect((await screen.findByRole("alert")).textContent).toContain("STOP");
  expect((screen.getByRole("button", { name: "Submit for final verification" }) as HTMLButtonElement).disabled).toBe(true);
});
it("requires real evidence even after a passing scan", () => {
  render(createElement(PackingFlow, { task: task(["ITEMS_CONFIRMED", "LABEL_RETRIEVED", "LABEL_SCANNED"]) }));
  expect(screen.getByLabelText("Package photo")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Confirm verified package" }) as HTMLButtonElement).disabled).toBe(true);
});
it("does not claim success after a network failure", async () => {
  mocks.action.mockRejectedValue(new Error("network failure"));
  render(createElement(PackingFlow, { task: task(["ITEMS_CONFIRMED"]) }));
  fireEvent.click(screen.getByRole("button", { name: "Retrieve assigned label" }));
  expect((await screen.findByRole("alert")).textContent).toContain("has not been marked verified");
});
it("permits final submission only when persisted checks and evidence are complete", async () => {
  const completedChecks = task(["ITEMS_CONFIRMED", "LABEL_RETRIEVED", "LABEL_SCANNED", "PACKAGE_CONFIRMED"]); completedChecks.submittedEvidence = ["PACKAGING_PHOTO"];
  mocks.action.mockResolvedValue({ ok: true, data: { completed: true, status: "COMPLETED", message: "Package verified and ready to ship." } });
  render(createElement(PackingFlow, { task: completedChecks }));
  fireEvent.click(screen.getByRole("button", { name: "Submit for final verification" }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({ action: "complete", taskId: "task-7" }));
  expect((await screen.findByRole("status")).textContent).toContain("ready to ship");
});
