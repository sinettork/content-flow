import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { ConnectionStatus } from "@/components/common/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { useAuthInit } from "@/features/auth/useAuth";
import { useAuthStore } from "@/stores/auth-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function AuthBootstrap({ children }: { children: ReactNode }) {
  useAuthInit();
  const { error, loading } = useAuthStore();
  if (error && !loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <section className="max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Session could not be restored</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again. You will remain signed out until the session is verified.</p>
          <p className="mt-2 text-xs text-destructive">{error}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>Retry</Button>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>{children}</AuthBootstrap>
        <ConnectionStatus />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
