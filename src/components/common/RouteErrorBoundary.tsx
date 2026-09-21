import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the diagnostic available to the hosting platform without exposing it
    // to users. An error-monitoring provider can hook in here in Phase 2.
    console.error("Unhandled route error", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <section className="max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page could not be loaded. Your data has not been changed.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={this.retry}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.assign("/app/dashboard")}>Go to dashboard</Button>
          </div>
        </section>
      </main>
    );
  }
}
