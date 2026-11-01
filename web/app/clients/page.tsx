"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, Users, ArrowDownUp } from "lucide-react";
import { useOs } from "@/lib/store";
import type { ClientStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Menu, Page, PageHeader, SearchField, Segmented } from "@/components/ui/primitives";
import { ClientCard } from "@/components/domain/client-card";
import { AddClientModal } from "@/components/domain/client-actions";
import { clientStatus } from "@/components/domain/meta";

type Filter = "all" | ClientStatus;
type Sort = "recent" | "name" | "value";

export default function ClientsPage() {
  const { clients } = useOs(); const router = useRouter();
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [sort, setSort] = useState<Sort>("recent");
  const [source, setSource] = useState("All sources"); const [adding, setAdding] = useState(false);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("filter"); if (f && f in clientStatus) setFilter(f as Filter); }, []);

  const sources = ["All sources", ...Array.from(new Set(clients.map((c) => c.source)))];
  const list = useMemo(() => {
    const s = q.toLowerCase();
    const l = clients.filter((c) => (filter === "all" || c.status === filter) && (source === "All sources" || c.source === source) &&
      (!s || [c.name, c.email, c.service, c.nextStep].some((v) => v.toLowerCase().includes(s))));
    return sort === "name" ? [...l].sort((a, b) => a.name.localeCompare(b.name)) : sort === "value" ? [...l].sort((a, b) => b.value - a.value) : l;
  }, [clients, q, filter, sort, source]);

  const options = [{ value: "all" as Filter, label: "All", count: clients.length },
    ...(Object.keys(clientStatus) as ClientStatus[]).map((k) => ({ value: k as Filter, label: clientStatus[k].label, count: clients.filter((c) => c.status === k).length }))];

  return (
    <Page>
      <PageHeader title="Clients" subtitle={`${clients.length} people · ${clients.filter((c) => c.status === "attention").length} need your attention`}
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add Client</Button>} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchField value={q} onChange={setQ} placeholder="Search clients" className="md:max-w-xs md:flex-1" />
        <div className="flex gap-2">
          <Menu align="left" trigger={<Button icon={SlidersHorizontal}>{source}</Button>} items={sources.map((s) => ({ label: s, onClick: () => setSource(s) }))} />
          <Menu align="left" trigger={<Button icon={ArrowDownUp}>{sort === "recent" ? "Recent" : sort === "name" ? "Name" : "Value"}</Button>}
            items={[{ label: "Recent activity", onClick: () => setSort("recent") }, { label: "Name", onClick: () => setSort("name") }, { label: "Highest value", onClick: () => setSort("value") }]} />
        </div>
      </div>
      <Segmented options={options} value={filter} onChange={setFilter} className="mb-5" />
      <Card className="p-2">
        <div className="hidden grid-cols-[auto_1.4fr_1fr_1.4fr_auto_auto] gap-4 px-4 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-mute md:grid">
          <span className="w-10" /><span>Client</span><span>Status</span><span>Next step</span><span className="text-right">Value</span><span className="w-4" />
        </div>
        {list.map((c) => <ClientCard key={c.id} client={c} />)}
        {list.length === 0 && <EmptyState icon={Users} title="No clients match" body="Try a different search or filter." action={<Button onClick={() => { setQ(""); setFilter("all"); setSource("All sources"); }}>Clear filters</Button>} />}
      </Card>
      <AddClientModal open={adding} onClose={() => setAdding(false)} onCreated={(id) => router.push(`/clients/${id}`)} />
    </Page>
  );
}
