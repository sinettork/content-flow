import { CalendarDays, FolderOpen, Kanban, List, Megaphone, UserCheck } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const VIEWS = [
  { to: "/app/content", label: "Content", icon: List },
  { to: "/app/board", label: "Board", icon: Kanban },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/my-work", label: "My Work", icon: UserCheck },
  { to: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/app/assets", label: "Assets", icon: FolderOpen },
];

export function ContentWorkspaceNav() {
  return (
    <nav aria-label="Content workspace views" className="mb-5 flex w-full flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
      {VIEWS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/app/content"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
