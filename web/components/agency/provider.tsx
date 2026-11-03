"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { publicSupabaseConfig } from "@/lib/supabase/env";
import { getMyOrganizationsAction } from "@/server/actions/operations";
import { agencyWorkspace } from "@/server/actions/agency";
import type { AgencySnapshot } from "@/server/adapters/agency";
import type { WorkspaceProfile } from "@/server/adapters/prototype";
import type { ActionResult } from "@/server/actions/result";
import { business as sampleBusiness } from "@/lib/config/business";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/primitives";
interface AgencyContext {
  workspace: AgencySnapshot | null;
  profile: WorkspaceProfile | null;
  org: string;
  organizations: { id: string; name: string; role: string }[];
  session: Session | null;
  loading: boolean;
  error: string;
  configured: boolean;
  busy: boolean;
  selectOrg: (id: string) => void;
  refresh: () => Promise<void>;
  run: <T>(fn: () => Promise<ActionResult<T>>) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const Context = createContext<AgencyContext | null>(null);
export const useAgency = () => {
  const c = useContext(Context);
  if (!c) throw new Error("AgencyProvider missing");
  return c;
};
export function AgencyProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () => (publicSupabaseConfig() ? createSupabaseBrowserClient() : null),
    [],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => !!publicSupabaseConfig());
  const [org, setOrg] = useState("");
  const [organizations, setOrganizations] = useState<
    AgencyContext["organizations"]
  >([]);
  const [workspace, setWorkspace] = useState<AgencySnapshot | null>(null);
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const authIdentity = useRef<string | null>(null);
  const sessionUserId = session?.user.id;
  useEffect(() => {
    if (!client) return;
    const acceptSession = (s: Session | null) => {
      const id = s?.user.id ?? null;
      if (authIdentity.current !== id) {
        epoch.current += 1;
        authIdentity.current = id;
        setWorkspace(null);
        setProfile(null);
        setOrganizations([]);
        setOrg("");
      }
      setSession(s);
    };
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => acceptSession(s));
    void client.auth.getSession().then(({ data, error: e }) => {
      if (e) setError(e.message);
      acceptSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [client]);
  useEffect(() => {
    let current = true;
    if (!sessionUserId) return;
    void getMyOrganizationsAction()
      .then((r) => {
        if (!current) return;
        if (r.ok) {
          setOrganizations(r.data);
          setLoading(r.data.length > 0);
          setOrg(r.data[0]?.id ?? "");
        } else setError(r.error.message);
      })
      .catch(() => {
        if (current) setError("Unable to load organizations");
      });
    return () => {
      current = false;
    };
  }, [sessionUserId]); // Token refresh does not reset the selected organization.
  useEffect(() => {
    let current = true;
    if (!org) return;
    void agencyWorkspace(org)
      .then((r) => {
        if (!current) return;
        if (r.ok) {
          setWorkspace(r.data.workspace);
          setProfile(r.data.profile);
        } else setError(r.error.message);
      })
      .catch(() => {
        if (current) setError("Unable to load workspace");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [org]);
  const refresh = useCallback(async () => {
    if (!org) return;
    const generation = epoch.current;
    const r = await agencyWorkspace(org);
    if (generation !== epoch.current) return;
    if (!r.ok) throw new Error(r.error.message);
    setWorkspace(r.data.workspace);
    setProfile(r.data.profile);
  }, [org]);
  const run = async <T,>(fn: () => Promise<ActionResult<T>>) => {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      if (!r.ok) throw new Error(r.error.message);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const value: AgencyContext = {
    workspace,
    profile,
    org,
    organizations,
    session,
    loading,
    error,
    configured: !!client,
    busy,
    selectOrg: (id) => {
      epoch.current += 1;
      setLoading(true);
      setError("");
      setWorkspace(null);
      setProfile(null);
      setOrg(id);
    },
    refresh,
    run,
    signIn: async (email, password) => {
      if (!client) return;
      setError("");
      setBusy(true);
      try {
        const { error: e } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (e) throw e;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    signOut: async () => {
      epoch.current += 1;
      if (client) {
        const { error: e } = await client.auth.signOut();
        if (e) {
          setError(e.message);
          return;
        }
      }
      setWorkspace(null);
      setProfile(null);
      setOrg("");
      setSession(null);
      window.location.reload();
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useBusiness() {
  const { profile } = useAgency();
  return {
    ...sampleBusiness,
    id: profile?.organization.id ?? "",
    name: profile?.organization.name ?? "Mithoo Business OS",
    shortName: profile?.organization.shortName ?? "Mithoo",
    monogram: profile?.organization.monogram ?? "M",
    type: "Business Operations",
    owner: {
      ...sampleBusiness.owner,
      name: profile?.viewer.name ?? "Your workspace",
      firstName: profile?.viewer.firstName ?? "there",
      title: profile?.viewer.role ?? "Team",
      image: profile?.viewer.avatarUrl ?? "",
      email: "",
    },
  };
}
export function AgencyGate({ children }: { children: ReactNode }) {
  const a = useAgency();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (!a.configured)
    return (
      <Card className="mt-16 p-8">
        <h2 className="text-xl font-semibold">Connect your workspace</h2>
        <p className="mt-3 text-mute">
          Configure Supabase and apply the agency migration to use production
          leads and clients.
        </p>
      </Card>
    );
  if (a.loading && !a.workspace)
    return (
      <p className="py-16 text-mute" role="status">
        Opening your workspace…
      </p>
    );
  if (!a.session)
    return (
      <Card className="mx-auto mt-16 max-w-md p-8">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="mt-2 text-mute">Sign in to Mithoo Business OS.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void a.signIn(email, password);
          }}
        >
          <Field label="Email">
            <Input
              id="agency-email"
              aria-label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              id="agency-password"
              aria-label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {a.error && (
            <p role="alert" className="text-rose-600">
              {a.error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={a.busy}>
            Sign in
          </Button>
        </form>
      </Card>
    );
  return (
    <>
      {a.error && (
        <p role="alert" className="my-4 text-sm text-rose-600">
          {a.error}
        </p>
      )}
      {!a.organizations.length ? (
        <p className="py-12 text-mute">
          No active organization membership. Ask your workspace owner for
          access.
        </p>
      ) : a.workspace ? (
        children
      ) : (
        <p className="py-12 text-mute">Workspace data is unavailable.</p>
      )}
    </>
  );
}
