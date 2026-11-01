"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { lookupPackageAction } from "@/server/actions/operations";
import type { PackageLookupResult } from "@/core/shipping/lookup";
import { Button } from "@/components/ui/button";
import { Card, Input, Field } from "@/components/ui/primitives";
export function PackageLookup() {
  const [result, setResult] = useState<PackageLookupResult | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const value = String(new FormData(e.currentTarget).get("lookup"));
    setResult(null); setError("");
    start(async () => {
      try { const response = await lookupPackageAction({ value }); if (response.ok) setResult(response.data); else setError(response.error.message); }
      catch { setError("Lookup unavailable. Please retry. Do not guess the package."); }
    });
  }
  return <Card className="mb-6 p-5 md:p-6"><form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
    <div className="flex-1"><Field label="Find a package" hint="Last 4 tracking digits, full tracking, order number, or barcode/QR scan"><Input aria-label="Find a package" name="lookup" minLength={4} maxLength={200} required autoComplete="off" disabled={pending} /></Field></div>
    <Button type="submit" size="lg" variant="primary" loading={pending}>Find package</Button>
  </form>
    <div aria-live="polite" className="mt-3 text-[14px]">
      {error && <p role="alert" className="text-rose-600">{error}</p>}
      {result?.kind === "AMBIGUOUS" && <p role="alert" className="text-rose-600">{result.message}</p>}
      {result?.kind === "NONE" && <p>{result.message}</p>}
      {result?.kind === "UNIQUE" && <Link href={`/orders/${result.match.orderId}`} className="inline-flex min-h-12 items-center gap-3 rounded-2xl bg-[#f4f3fb] px-4 font-medium">{result.match.orderNumber} · {result.match.carrier ?? "Carrier unknown"} {result.match.trackingLast4} · Open authorized order →</Link>}
    </div>
  </Card>;
}
