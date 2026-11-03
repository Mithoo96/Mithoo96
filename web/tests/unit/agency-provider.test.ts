// @vitest-environment happy-dom
import React, { createElement, useLayoutEffect } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  organizations: vi.fn(),
  workspace: vi.fn(),
  getSession: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock("@/lib/supabase/env", () => ({ publicSupabaseConfig: () => ({ url: "https://example.test", anonKey: "test" }) }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: {
  getSession: mocks.getSession,
  onAuthStateChange: mocks.subscribe,
} }) }));
vi.mock("@/server/actions/operations", () => ({ getMyOrganizationsAction: mocks.organizations }));
vi.mock("@/server/actions/agency", () => ({ agencyWorkspace: mocks.workspace }));
import { AgencyProvider, useAgency } from "@/components/agency/provider";

let context: ReturnType<typeof useAgency>;
function Probe() {
  const value = useAgency();
  useLayoutEffect(() => { context = value; });
  return createElement("span", null, value.loading ? "loading" : value.org);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function mount() {
  return render(createElement(AgencyProvider, null, createElement(Probe)));
}
async function ready() {
  mount();
  await waitFor(() => expect(context.org).toBe("org-a"));
  await waitFor(() => expect(context.loading).toBe(false));
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
  mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.organizations.mockResolvedValue({ ok: true, data: [
    { id: "org-a", name: "Agency A", role: "OWNER" },
    { id: "org-b", name: "Agency B", role: "OWNER" },
  ] });
  mocks.workspace.mockImplementation(async (org: string) => ({ ok: true, data: { workspace: { org }, profile: { org } } }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("Agency workspace lifecycle", () => {
  it("keeps the loaded workspace when selecting the current or an unavailable organization", async () => {
    await ready();
    const workspace = context.workspace;
    act(() => context.selectOrg("org-a"));
    act(() => context.selectOrg("not-a-member"));
    expect(context.org).toBe("org-a");
    expect(context.workspace).toBe(workspace);
    expect(context.loading).toBe(false);
    expect(mocks.workspace).toHaveBeenCalledTimes(1);
  });

  it("does not refresh the old workspace when a mutation finishes after switching organizations", async () => {
    await ready();
    const mutation = deferred<{ ok: true; data: null }>();
    let result!: Promise<boolean>;
    act(() => { result = context.run(() => mutation.promise); });
    act(() => context.selectOrg("org-b"));
    await waitFor(() => expect(context.loading).toBe(false));
    await act(async () => { mutation.resolve({ ok: true, data: null }); await result; });
    expect(await result).toBe(false);
    expect(context.org).toBe("org-b");
    expect(context.workspace).toEqual({ org: "org-b" });
    expect(context.busy).toBe(false);
    expect(mocks.workspace.mock.calls.map(([org]) => org)).toEqual(["org-a", "org-b"]);
  });

  it("stops loading and reports an organization lookup failure", async () => {
    mocks.organizations.mockRejectedValue(new Error("network failure"));
    mount();
    await waitFor(() => expect(context.error).toBe("Unable to load organizations"));
    expect(context.loading).toBe(false);
    expect(context.workspace).toBeNull();
  });

  it("stops loading when session restoration rejects", async () => {
    mocks.getSession.mockRejectedValue(new Error("network failure"));
    mount();
    await waitFor(() => expect(context.error).toContain("Unable to restore your session"));
    expect(context.loading).toBe(false);
    expect(context.session).toBeNull();
  });

  it("ignores a delayed initial session result after an Auth sign-out event", async () => {
    const initial = deferred<unknown>();
    mocks.getSession.mockReturnValue(initial.promise);
    mount();
    const onAuth = mocks.subscribe.mock.calls[0][0];
    act(() => onAuth("SIGNED_OUT", null));
    await act(async () => {
      initial.resolve({ data: { session: { user: { id: "previous-owner" } } }, error: null });
      await initial.promise;
    });
    expect(context.session).toBeNull();
    expect(context.loading).toBe(false);
    expect(mocks.organizations).not.toHaveBeenCalled();
  });

  it("does not show a former organization's mutation error in the new workspace", async () => {
    await ready();
    const mutation = deferred<{ ok: false; error: { code: "FORBIDDEN"; message: string } }>();
    let result!: Promise<boolean>;
    act(() => { result = context.run(() => mutation.promise); });
    act(() => context.selectOrg("org-b"));
    await waitFor(() => expect(context.loading).toBe(false));
    await act(async () => {
      mutation.resolve({ ok: false, error: { code: "FORBIDDEN", message: "Previous workspace failure" } });
      await result;
    });
    expect(context.error).toBe("");
    expect(context.org).toBe("org-b");
    expect(context.busy).toBe(false);
  });

});
