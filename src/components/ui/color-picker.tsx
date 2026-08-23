import { Check, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

interface ColorPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function normalizeHex(value: string) {
  const next = value.trim();
  if (!next) return "";
  return next.startsWith("#") ? next : `#${next}`;
}

export function ColorPicker({ value, onValueChange, disabled, className }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start bg-background font-normal", className)}
        >
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: value }} />
          <span className="font-mono text-xs uppercase">{value}</span>
          <Palette className="ml-auto h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">Campaign color</div>
          <div className="text-xs text-muted-foreground">Pick a preset or enter a hex color.</div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_COLORS.map((color) => {
            const selected = color.toLowerCase() === value.toLowerCase();

            return (
              <button
                key={color}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ backgroundColor: color }}
                onClick={() => onValueChange(color)}
                aria-label={`Use color ${color}`}
              >
                {selected && <Check className="h-4 w-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
        <Input
          value={value}
          onChange={(event) => onValueChange(normalizeHex(event.target.value))}
          placeholder="#6366f1"
          className="font-mono text-xs uppercase"
        />
      </PopoverContent>
    </Popover>
  );
}
