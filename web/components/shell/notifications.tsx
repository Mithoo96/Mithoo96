"use client";
import {Drawer} from "@/components/ui/overlay";
import type {WorkspaceNotice} from "@/server/adapters/workspace-views";
export function NotificationsDrawer({notices,...props}:{notices:WorkspaceNotice[];open:boolean;onClose:()=>void}){return <Drawer {...props} title="Notifications">{notices.length?notices.map(n=><article key={n.id} className="border-b border-hair py-4"><h3 className="font-medium">{n.title}</h3><p className="mt-1 text-sm text-mute">{n.body}</p></article>):<p className="text-sm text-mute">No operational notifications.</p>}</Drawer>;}
