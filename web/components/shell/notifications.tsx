"use client";
import dynamic from "next/dynamic";
import {Drawer} from "@/components/ui/overlay";
import {useWorkspace} from "./workspace";
import {hasDocMoisePrototype} from "@/core/tenancy/modules";
import type {WorkspaceNotice} from "@/server/adapters/workspace-views";
const Prototype=dynamic(()=>import("@/components/prototype/doc-moise/notifications").then(m=>m.NotificationsDrawer));
export function NotificationsDrawer({notices,...props}:{notices:WorkspaceNotice[];open:boolean;onClose:()=>void}){const workspace=useWorkspace();if(hasDocMoisePrototype(workspace.profile.organization))return <Prototype {...props}/>;return <Drawer {...props} title="Notifications">{notices.length?notices.map(n=><article key={n.id} className="border-b border-hair py-4"><h3 className="font-medium">{n.title}</h3><p className="mt-1 text-sm text-mute">{n.body}</p></article>):<p className="text-sm text-mute">No operational notifications.</p>}</Drawer>;}
