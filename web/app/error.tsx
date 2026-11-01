"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-white p-6">
    <section className="glass w-full max-w-[440px] rounded-[30px] p-8">
      <p className="text-[12px] uppercase tracking-[0.14em] text-mute">Mithoo Business OS</p>
      <h1 className="mt-5 text-[28px] font-semibold">Workspace unavailable</h1>
      <p role="alert" className="mt-3 text-[14px] text-mute">We could not load your workspace. Please try again shortly.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-ink px-6 py-3 text-[14px] text-white">Try again</button>
    </section>
  </main>;
}
