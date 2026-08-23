import {
  LayoutDashboard,
  FileText,
  Calendar,
  Kanban,
  Megaphone,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
  UserCircle,
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
  Monitor,
  Menu,
  ChevronsLeft,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { SearchCommand } from "@/components/common/SearchCommand";
import { Toaster } from "@/components/common/Toaster";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { signOut } from "@/features/auth/useAuth";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { useUiStore } from "@/stores/ui-store";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/content", label: "Content", icon: FileText },
  { to: "/app/board", label: "Board", icon: Kanban },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/app/assets", label: "Assets", icon: FolderOpen },
  { to: "/app/team", label: "Team", icon: Users },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
];

const NAV_BOTTOM = [
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useUiStore();
  const { theme, setTheme } = useThemeStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Fetch unread count
  useEffect(() => {
    if (!user) return;
    notificationService.unreadCount(user.id).then(setUnreadCount);
  }, [user, location.pathname]);

  // Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const nextTheme: Record<string, "light" | "dark" | "system"> = {
    light: "dark",
    dark: "system",
    system: "light",
  };
  const ThemeIcon = themeIcons[theme];

  function NavItems({ collapsed }: { collapsed: boolean }) {
    return (
      <>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors duration-150 active:translate-y-px",
                collapsed && "mx-auto h-10 w-10 justify-center px-0 py-0",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </>
    );
  }

  // ── Sidebar (desktop) ────────────────────────────
  const sidebar = (
    <aside
      className={cn(
        "hidden h-screen shrink-0 overflow-hidden border-r border-sidebar-border/70 bg-sidebar/95 transition-all duration-200 md:sticky md:top-0 md:flex md:flex-col",
        sidebarCollapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border/70 px-3.5", sidebarCollapsed && "justify-center px-2")}>
        {!sidebarCollapsed && (
          <div className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]">
            CF
          </div>
        )}
        {!sidebarCollapsed && (
          <span className="ml-3 text-lg font-bold tracking-tight">ContentFlow</span>
        )}
        <Tooltip content={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"} side="right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            className={cn("ml-auto h-9 w-9 text-muted-foreground hover:bg-primary/10 hover:text-primary", sidebarCollapsed && "mx-0 ml-0")}
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform duration-200", sidebarCollapsed && "rotate-180")} />
          </Button>
        </Tooltip>
      </div>

      {/* Main nav */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5 scrollbar-thin">
        <NavItems collapsed={sidebarCollapsed} />
      </nav>

      {/* Bottom nav */}
      <div className="shrink-0 space-y-1 border-t border-sidebar-border/70 p-2.5">
        {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors duration-150 active:translate-y-px",
                sidebarCollapsed && "mx-auto h-10 w-10 justify-center px-0 py-0",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  );

  // ── Mobile drawer ────────────────────────────────
  const mobileDrawer = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent className="max-h-screen md:hidden">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <span className="bg-gradient-to-r from-palette-blue via-palette-violet to-palette-rose bg-clip-text text-lg font-bold text-transparent">ContentFlow</span>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          <NavItems collapsed={false} />
          <Separator className="my-2" />
          {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ease-out active:translate-y-px",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t p-3">
          <div className="mb-2 px-3 py-1">
            <div className="text-[15px] font-medium">{profile?.full_name ?? user?.email}</div>
            <div className="text-xs text-muted-foreground capitalize">{profile?.role}</div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // ── Topbar ───────────────────────────────────────
  const topbar = (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search trigger */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setSearchOpen(true)}
        className="hidden h-10 w-80 justify-between rounded-md border-border/80 bg-background/75 px-3.5 text-[15px] font-normal text-muted-foreground shadow-none hover:border-palette-cyan/35 hover:bg-palette-cyan/5 md:flex"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">Search...</span>
        </span>
        <kbd className="ml-3 shrink-0 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <div className="flex-1" />

      {/* Theme toggle */}
      <Tooltip content={`Theme: ${theme}`}>
        <Button variant="ghost" size="icon" onClick={() => setTheme(nextTheme[theme])}>
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </Tooltip>

      {/* Notifications */}
      <Tooltip content="Notifications">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/app/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </Tooltip>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="h-10 gap-2 px-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-[15px] font-medium md:inline">{profile?.full_name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="text-sm">{profile?.full_name}</div>
            <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/app/profile")}>
            <UserCircle className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/app/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebar}
      {mobileDrawer}

      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="app-surface min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">
            <Suspense fallback={<AppLoader label="Loading page" delay={900} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  );
}
