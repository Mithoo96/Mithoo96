"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
export function LoginForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) { setError(error.code === "invalid_credentials" ? "Email or password is incorrect." : "Unable to sign in. Please try again shortly."); setPending(false); return; }
      window.location.assign(next);
    } catch { setError("Unable to connect. Please try again."); setPending(false); }
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6">
    <div aria-hidden className="orb orb-a left-[12%] top-[10%] h-[420px] w-[420px] bg-[#c9d8ff] opacity-40" />
    <div aria-hidden className="orb orb-c right-[12%] top-[30%] h-[380px] w-[380px] bg-[#f3e6cf] opacity-50" />
    <form onSubmit={submit} className="glass relative w-full max-w-[440px] rounded-[30px] p-8 md:p-10">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Mithoo Business OS</p>
      <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.03em]">Welcome back.</h1>
      <p className="mt-2 text-[14px] text-mute">Sign in to your business workspace.</p>
      <label className="mt-7 block text-[14px]">Email<input name="email" type="email" autoComplete="username" required disabled={pending} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-hair" /></label>
      <label className="mt-5 block text-[14px]">Password<input name="password" type="password" autoComplete="current-password" required disabled={pending} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-hair" /></label>
      {error && <p role="alert" className="mt-4 text-[14px] text-rose-600">{error}</p>}
      <button disabled={pending} aria-busy={pending} className="mt-7 h-12 w-full rounded-full bg-ink text-[15px] font-medium text-white disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
      <Link href="/signup" className="mt-5 block text-center text-sm underline">Create an account</Link><p className="mt-6 text-center text-[11px] text-mute">Powered by Mithoo</p>
    </form>
  </main>;
}
