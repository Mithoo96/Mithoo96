"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, Users, ArrowDownUp } from "lucide-react";
import { useOs } from "@/lib/store";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Menu, Page, PageHeader, SearchField, Segmented } from "@/components/ui/primitives";
import { ClientCard, clientGrid } from "@/components/domain/client-card";
import { AddClientModal } from "@/components/domain/client-actions";


type Filter = "all" | "tax" | "insurance" | "attention" | "active" | "completed" | "new";
const match: Record<Filter, (c: Client) => boolean> = {
  all: () => true, tax: (c) => c.lines.includes("tax"), insurance: (c) => c.lines.includes("insurance"),
  attention: (c) => c.status === "attention" || c.status === "waiting", active: (c) => c.status === "active", completed: (c) => c.status === "completed", new: (c) => c.status === "new",
};
type Sort = "recent" | "name" | "value";

export default function ClientsPage() {
  const { clients, mode } = useOs(); const router = useRouter();
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [sort, setSort] = useState<Sort>("recent");
  const [source, setSource] = useState("All sources"); const [adding, setAdding] = useState(false);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("filter"); if (f && f in match) setFilter(f as Filter); else if (mode !== "all") setFilter(mode); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sources = ["All sources", ...Array.from(new Set(clients.map((c) => c.source)))];
  const list = useMemo(() => {
    const s = q.toLowerCase();
    const l = clients.filter((c) => match[filter](c) && (source === "All sources" || c.source === source) &&
      (!s || [c.name, c.email, c.service, c.nextAction, c.taxStage ?? "", c.insuranceStage ?? "", c.product ?? ""].some((v) => v.toLowerCase().includes(s))));
    return sort === "name" ? [...l].sort((a, b) => a.name.localeCompare(b.name)) : sort === "value" ? [...l].sort((a, b) => b.value - a.value) : l;
  }, [clients, q, filter, sort, source]);

  const labels: [Filter, string][] = [["all", "All"], ["tax", "Tax"], ["insurance", "Insurance"], ["attention", "Needs Attention"], ["active", "Active"], ["completed", "Completed"]];
  const options = labels.map(([value, label]) => ({ value, label, count: clients.filter(match[value]).length }));

  return (
    <Page>
      <PageHeader title="Clients" subtitle={`${clients.filter((c) => c.lines.includes("tax")).length} tax · ${clients.filter((c) => c.lines.includes("insurance")).length} insurance · ${clients.filter(match.attention).length} need attention`}
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
        <div className={`hidden gap-4 px-4 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-mute md:grid ${clientGrid}`}>
          <span className="w-10" /><span>Name · Service</span><span>Stage</span><span>Last Contact</span><span>Next Action</span><span>Status</span><span className="w-4" />
        </div>
        {list.map((c) => <ClientCard key={c.id} client={c} />)}
        {list.length === 0 && <EmptyState icon={Users} title="No clients match" body="Try a different search or filter." action={<Button onClick={() => { setQ(""); setFilter("all"); setSource("All sources"); }}>Clear filters</Button>} />}
      </Card>
      <AddClientModal open={adding} onClose={() => setAdding(false)} onCreated={(id) => router.push(`/clients/${id}`)} />
    </Page>
  );
}
