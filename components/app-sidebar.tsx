"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Search,
  Settings,
  LogOut,
  Menu,
  Radar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "cn";
import { tr } from "@/lib/tr";

const NAV_ITEMS = [
  { href: "/", label: tr.nav.dashboard, icon: LayoutDashboard },
  { href: "/businesses", label: tr.nav.businesses, icon: Building2 },
  { href: "/searches", label: tr.nav.searches, icon: Search },
  { href: "/settings", label: tr.nav.settings, icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout-failed");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error(tr.panel.logoutError);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className={cn("justify-start gap-2.5 text-muted-foreground", className)}
      onClick={handleLogout}
      disabled={loggingOut}
    >
      <LogOut className="size-4" />
      {tr.nav.logout}
    </Button>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-card">
        <div className="flex items-center gap-2 px-4 py-4">
          <Radar className="size-5 text-primary" />
          <span className="font-heading text-sm font-semibold">
            {tr.app.name}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between px-3 pb-4">
          <NavLinks />
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Radar className="size-5 text-primary" />
          <span className="font-heading text-sm font-semibold">
            {tr.app.name}
          </span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tr.panel.menuOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent side="left" className="flex flex-col gap-0 p-0">
            <SheetHeader>
              <SheetTitle>{tr.app.name}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col justify-between px-3 pb-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <LogoutButton />
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
