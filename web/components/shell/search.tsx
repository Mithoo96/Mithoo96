"use client";
import Link from "next/link";
import {useState} from "react";
import {Modal} from "@/components/ui/overlay";
import {useWorkspace} from "./workspace";
import {mainNav,bottomNav,visibleNav} from "./nav";
export function SearchModal(props:{open:boolean;onClose:()=>void}){const workspace=useWorkspace();const[q,setQ]=useState("");return <Modal {...props} title="Search workspace"><input aria-label="Search workspace" value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-xl border border-hair p-3" placeholder="Find a workspace page"/><div className="mt-3 grid gap-1">{visibleNav([...mainNav,...bottomNav],workspace).filter(i=>i.label.toLowerCase().includes(q.toLowerCase())).map(i=><Link onClick={props.onClose} key={i.href} href={i.href} className="rounded-xl p-3 hover:bg-[#f4f4f8]">{i.label}</Link>)}</div></Modal>;}
