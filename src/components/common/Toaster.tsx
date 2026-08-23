import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";

const VARIANT_CONFIG: Record<string, { className: string; icon: typeof Info }> = {
  default: {
    className: "border bg-card text-card-foreground shadow-lg",
    icon: Info,
  },
  success: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-500/5 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
    icon: CheckCircle2,
  },
  destructive: {
    className:
      "border-red-200 bg-red-50 text-red-900 shadow-lg shadow-red-500/5 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    icon: AlertCircle,
  },
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => {
        const config = VARIANT_CONFIG[toast.variant ?? "default"];
        const IconComp = config.icon;

        return (
          <ToastPrimitive.Root
            key={toast.id}
            open
            duration={5000}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id);
            }}
            className={cn(
              "grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border p-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full sm:max-w-sm",
              config.className
            )}
          >
            <IconComp className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
            <div className="min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium">{toast.title}</ToastPrimitive.Title>
              {toast.description && (
                <ToastPrimitive.Description className="mt-0.5 text-xs leading-relaxed opacity-70">
                  {toast.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="shrink-0 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
