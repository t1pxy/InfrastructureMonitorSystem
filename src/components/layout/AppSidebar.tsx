"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cctv,
  Cpu,
  LayoutDashboard,
  Server,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

type MenuItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Home",
        href: "/home",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        title: "Hardware Monitor",
        href: "/hardware",
        icon: Cpu,
      },
      {
        title: "Windows Update",
        href: "/update",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      {
        title: "NVR",
        href: "/nvr",
        icon: Server,
      },
      {
        title: "CCTV",
        href: "/cctv",
        icon: Cctv,
      },
      {
        title: "Manage NVR/CCTV",
        href: "/hikvision/config",
        icon: Settings,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Reports",
        href: "/report",
        icon: BarChart3,
      },
      {
        title: "Settings",
        href: "/setting",
        icon: Settings,
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home" || pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Link href="/home" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            IHL
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              Infrastructure
            </div>

            <div className="truncate text-xs text-muted-foreground">
              Monitor System
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {menuSections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />

                      <span className="truncate">{item.title}</span>

                      {active ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/90" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t p-3">
        <div className="rounded-xl border bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-medium">Monitoring System</span>
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Infrastructure Monitor v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
