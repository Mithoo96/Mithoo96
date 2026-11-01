"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSupabaseSetupClient } from "@/lib/supabase/client";
import { invitationGrant } from "@/lib/supabase/invitation";

export function PasswordSetup() {
  const client = useRef<ReturnType<typeof createSupabaseSetupClient> | null>(null);
  const initialized = useRef(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const failed = params.has("error") || new URLSearchParams(window.location.search).has("invalid");
    // Never retain invitation credentials in browser history or propagate them to another page.
    window.history.replaceState(null, "", window.location.pathname);
    async function initialize() {
      try {
        if (failed) throw new Error();
        const auth = createSupabaseSetupClient(); client.current = auth;
        if (params.has("access_token") || params.has("refresh_token")) {
          const type = params.get("type");
          if (!["invite", "recovery"].includes(type ?? "") || !params.get("access_token") || !params.get("refresh_token")) throw new Error();
          const { error } = await auth.auth.setSession({ access_token: params.get("access_token")!, refresh_token: params.get("refresh_token")! });
          if (error) throw new Error();
        }
        const { data, error } = await auth.auth.getUser();
        if (error || !data.user?.email) throw new Error();
        setEmail(data.user.email);
      } catch { setError("Open a valid invitation or password-reset email to choose your password. Expired links require a new invitation."); }
      finally { setLoading(false); }
    }
    void initialize();
  }, []);
  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true); setError("");
    try {
      const grant = invitationGrant(String(new FormData(form).get("invitation") ?? ""), process.env.NEXT_PUBLIC_SUPABASE_URL!);
      const auth = client.current ?? createSupabaseSetupClient(); client.current = auth;
      const { error } = await auth.auth.verifyOtp(grant);
      form.reset();
      if (error) throw new Error();
      const { data, error: userError } = await auth.auth.getUser();
      if (userError || !data.user?.email) throw new Error();
      setEmail(data.user.email);
    } catch { form.reset(); setError("This invitation could not be verified. Copy the original Supabase invitation link from your email, or request a fresh invitation if it has expired."); }
    finally { setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !client.current || !email) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    if (password.length < 12 || password.length > 128) { setError("Use a password between 12 and 128 characters."); return; }
    if (password !== fields.get("confirm")) { setError("Passwords do not match."); return; }
    setPending(true); setError("");
    try {
      const auth = client.current;
      // Reverify the session: never trust an email or user identity supplied by a URL.
      const { data, error: userError } = await auth.auth.getUser();
      if (userError || data.user?.email !== email) throw new Error();
      const { error } = await auth.auth.updateUser({ password });
      if (error) { setError("Your password could not be saved. Check the password requirements or request a fresh setup link."); return; }
      form.reset();
      const { error: signOutError } = await auth.auth.signOut({ scope: "local" });
      if (signOutError) throw new Error();
      const { error: loginError } = await auth.auth.signInWithPassword({ email, password });
      if (loginError) { setError("Your password was saved. Return to sign in with your email and new password."); return; }
      window.location.replace("/");
    } catch { setError("Setup could not finish. Return to sign in, or request a new invitation if needed."); }
    finally { setPending(false); }
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6">
    <div aria-hidden className="orb orb-a left-[12%] top-[10%] h-[420px] w-[420px] bg-[#c9d8ff] opacity-40" />
    <div aria-hidden className="orb orb-c right-[12%] top-[30%] h-[380px] w-[380px] bg-[#f3e6cf] opacity-50" />
    <section className="glass relative w-full max-w-[440px] rounded-[30px] p-8 md:p-10">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Mithoo Business OS</p>
      <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.03em]">Choose your password.</h1>
      {loading && <p role="status" className="mt-4 text-[14px] text-mute">Verifying your setup link…</p>}
      {!loading && !email && <form onSubmit={acceptInvitation} className="mt-5">
        <p className="text-[14px] text-mute">If your email link does not return here, copy the invitation link from your email and paste it privately below. Never share it in chat.</p>
        <label className="mt-6 block text-[14px]">Invitation link<input name="invitation" type="password" autoComplete="off" spellCheck={false} required disabled={pending} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-hair" /></label>
        <button disabled={pending} aria-busy={pending} className="mt-7 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white disabled:opacity-60">{pending ? "Verifying…" : "Verify invitation"}</button>
      </form>}
      {email && <form onSubmit={submit} className="mt-5">
        <p className="text-[14px] text-mute">Set a private password for {email}. Use 12 or more characters.</p>
        <label className="mt-6 block text-[14px]">New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={pending} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-hair" /></label>
        <label className="mt-5 block text-[14px]">Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={pending} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-hair" /></label>
        <button disabled={pending} aria-busy={pending} className="mt-7 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white disabled:opacity-60">{pending ? "Saving…" : "Save password and sign in"}</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-[14px] text-rose-600">{error}</p>}
      <Link href="/login" className="mt-6 inline-block text-[14px] text-mute underline">Return to sign in</Link>
      <p className="mt-6 text-center text-[11px] text-mute">Powered by Mithoo</p>
    </section>
  </main>;
}
