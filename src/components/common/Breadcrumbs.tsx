import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
      {items.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-foreground transition-colors duration-150">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
