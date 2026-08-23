import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { ConnectionStatus } from "@/components/common/ConnectionStatus";
import { useAuthInit } from "@/features/auth/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function AuthBootstrap({ children }: { children: ReactNode }) {
  useAuthInit();
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
