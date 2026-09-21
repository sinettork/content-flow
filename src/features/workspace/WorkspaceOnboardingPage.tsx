import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { workspaceService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export function WorkspaceOnboardingPage() {
  const navigate = useNavigate();
  const { session, profile, loading, setProfile } = useAuthStore();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (profile) navigate("/app/dashboard", { replace: true });
  }, [navigate, profile]);

  if (loading) return <AppLoader fullScreen label="Loading account" />;
  if (!session) return <Navigate to="/auth/sign-in" replace />;
  if (profile) return null;
  const currentSession = session;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const createdProfile = await workspaceService.create({
        name,
        userId: currentSession.userId,
        email: currentSession.email,
      });
      setProfile(createdProfile);
      toast("Workspace created", { variant: "success" });
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to create workspace.", { variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>
            Create the business workspace where your team will plan, review, and publish content together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="workspace-name">Workspace name</label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Marketing"
                maxLength={80}
                required
              />
              <p className="text-xs text-muted-foreground">Use one workspace for your whole team and all social channels.</p>
            </div>
            <Button className="w-full" type="submit" disabled={creating || !name.trim()}>
              {creating ? "Creating workspace…" : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
