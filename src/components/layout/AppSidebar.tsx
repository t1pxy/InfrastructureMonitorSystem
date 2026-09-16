"use client"

import Link from "next/link"
import { BarChart3, LayoutDashboard, Settings, ShieldCheck, Cpu, Server, Cctv } from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    title: "Home",
    href: "/home",
    icon: LayoutDashboard
  },
  {
    title: "Hardware Monitor",
    href: "/hardware",
    icon: Cpu
  },
  {
    title: "NVR",
    href: "/nvr",
    icon: Server
  },
  {
    title: "CCTV",
    href: "/cctv",
    icon: Cctv
  },
  {
    title: "Windows Update",
    href: "/update",
    icon: ShieldCheck
  },
  {
    title: "Reports",
    href: "/report",
    icon: BarChart3
  },
  {
    title: "Settings",
    href: "/setting",
    icon: Settings
  }
];

export default function AppSidebar() {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            IHL
          </div>
          <div>
            <h1 className="font-semibold">Infrastructure</h1>
            <p className="text-xs text-muted-foreground">Monitor System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Main Menu</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg py-2.5", "text-sm fint-medium text-muted-foreground", "transition-colors hover:bg-muted hover:text-foreground")}><Icon className="h-5 w-5"></Icon><span>{item.title}</span></Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <div className="rounded-lg bg-mute p-3">
          <p className="text-sm font-medium">Hardware Monitor System</p>
          <p className="mt-1 text-xs text-muted-foreground">Version 1.0</p>
        </div>
      </div>
    </aside>
  );
}
