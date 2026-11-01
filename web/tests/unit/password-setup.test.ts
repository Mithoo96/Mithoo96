// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PasswordSetup } from "@/app/auth/setup/password-setup";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), setSession: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseSetupClient: () => ({ auth: mocks }) }));
beforeEach(() => {
  vi.resetAllMocks(); window.history.replaceState(null, "", "/auth/setup");
  mocks.getUser.mockResolvedValue({ data: { user: { email: "preview@example.test" } }, error: null });
  for (const method of [mocks.setSession, mocks.updateUser, mocks.signOut, mocks.signInWithPassword]) method.mockResolvedValue({ error: null });
});
afterEach(cleanup);
it("verifies an invitation fragment and removes it from the address before showing password fields", async () => {
  window.history.replaceState(null, "", "/auth/setup#access_token=fictional-access&refresh_token=fictional-refresh&type=invite");
  render(createElement(PasswordSetup));
  await screen.findByLabelText("New password");
  expect(mocks.setSession).toHaveBeenCalledWith({ access_token: "fictional-access", refresh_token: "fictional-refresh" });
  expect(mocks.getUser).toHaveBeenCalled(); expect(window.location.hash).toBe("");
});
it("does not show password controls for an expired or unverifiable invitation", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found" } });
  render(createElement(PasswordSetup));
  await screen.findByRole("alert");
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
it("refuses incomplete or unexpected URL grants", async () => {
  window.history.replaceState(null, "", "/auth/setup#access_token=fictional-access&type=untrusted");
  render(createElement(PasswordSetup)); await screen.findByRole("alert");
  expect(mocks.setSession).not.toHaveBeenCalled(); expect(mocks.updateUser).not.toHaveBeenCalled();
});
it("requires matching passwords before changing anything", async () => {
  render(createElement(PasswordSetup)); await screen.findByLabelText("New password");
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "fictional-unit-test-value" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-unit-test-value" } });
  fireEvent.submit(screen.getByRole("button", { name: "Save password and sign in" }).closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toBe("Passwords do not match.");
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
it("revokes the setup session and uses normal email/password auth after a verified update", async () => {
  mocks.signInWithPassword.mockResolvedValue({ error: { code: "test-stop-before-navigation" } });
  render(createElement(PasswordSetup)); await screen.findByLabelText("New password");
  for (const label of ["New password", "Confirm password"]) fireEvent.change(screen.getByLabelText(label), { target: { value: "fictional-unit-test-value" } });
  fireEvent.submit(screen.getByRole("button", { name: "Save password and sign in" }).closest("form")!);
  await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "preview@example.test", password: "fictional-unit-test-value" }));
  expect(mocks.updateUser).toHaveBeenCalledWith({ password: "fictional-unit-test-value" });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe("");
});
it("does not update a different account if the authenticated identity changes", async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: { email: "preview@example.test" } }, error: null }).mockResolvedValue({ data: { user: { email: "other@example.test" } }, error: null });
  render(createElement(PasswordSetup)); await screen.findByLabelText("New password");
  for (const label of ["New password", "Confirm password"]) fireEvent.change(screen.getByLabelText(label), { target: { value: "fictional-unit-test-value" } });
  fireEvent.submit(screen.getByRole("button", { name: "Save password and sign in" }).closest("form")!);
  await screen.findByRole("alert"); expect(mocks.updateUser).not.toHaveBeenCalled();
});
