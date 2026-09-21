import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";

import { updatePassword } from "./useAuth";

export function UpdatePasswordPage() {
  const session = useAuthStore((state) => state.session);
  const loadingSession = useAuthStore((state) => state.loading);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!loadingSession && !session) return <Navigate to="/auth/sign-in" replace />;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");

    setSaving(true);
    const { error: updateError } = await updatePassword(password);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigate("/app/dashboard", { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">CF</div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your ContentFlow account.</p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Update password</CardTitle>
          <CardDescription>Your new password must contain at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" autoComplete="new-password" required placeholder="Enter new password" className="pl-9" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirm new password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirmation" type="password" autoComplete="new-password" required placeholder="Confirm new password" className="pl-9" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </div>
            </div>

            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving || loadingSession}>
              {saving ? "Updating…" : "Update password"}
              {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <Link to="/auth/sign-in" className="block text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Back to sign in</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
