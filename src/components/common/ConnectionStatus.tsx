import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[110] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground shadow-[0_12px_30px_rgba(220,38,38,0.18)]">
        <WifiOff className="h-4 w-4" />
        Connection lost
      </div>
    </div>
  );
}
