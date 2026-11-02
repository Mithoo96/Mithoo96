"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CircleAlert, Sparkles } from "lucide-react";
import { useOs } from "@/lib/store";
import { Drawer } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { EmptyState, Segmented } from "@/components/ui/primitives";
import { ActivityItem } from "@/components/domain/activity-item";
import type { Notification } from "@/lib/types";

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const os = useOs(); const router = useRouter();
  const [tab, setTab] = useState<Notification["kind"]>("action");
  const list = os.notifications.filter((n) => n.kind === tab);
  const count = (k: Notification["kind"]) => os.notifications.filter((n) => n.kind === k && !n.read).length;
  return (
    <Drawer open={open} onClose={onClose} title="Notifications · Prototype preview" description="What needs you, what matters, and what Mithoo handled."
      footer={<Button variant="ghost" size="sm" onClick={os.markAllNotificationsRead}>Mark all as read</Button>}>
      <Segmented value={tab} onChange={setTab} options={[{ value: "action", label: "Needs Action", count: count("action") }, { value: "important", label: "Important", count: count("important") }, { value: "ai", label: "AI Handled" }]} />
      <ul className="mt-5 space-y-1">
        {list.length === 0 && <EmptyState icon={Bell} title="You're all caught up" />}
        {list.map((n) => (
          <li key={n.id}>
            <button onClick={() => { os.markNotificationRead(n.id); if (n.href) { router.push(n.href); onClose(); } }}
              className="relative w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#f7f7fa]">
              {!n.read && <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-iris" />}
              <ActivityItem brand={n.brand} icon={n.kind === "ai" ? Sparkles : CircleAlert} title={n.title} detail={n.body} when={n.time} />
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
