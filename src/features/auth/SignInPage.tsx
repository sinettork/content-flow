import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn } from "./useAuth";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const dest = location.state?.from?.pathname ?? "/app/dashboard";
    navigate(dest, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md">
          CF
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-center text-sm text-muted-foreground">Sign in to your ContentFlow workspace</p>
      </div>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Workspace sign in</CardTitle>
          <CardDescription>Use your account or one of the demo roles below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1.5 font-semibold text-foreground text-[13px]">Demo accounts</div>
            <div className="grid gap-1 sm:grid-cols-2">
              <div><span className="font-medium">admin@demo.com</span> · Admin</div>
              <div><span className="font-medium">manager@demo.com</span> · Manager</div>
              <div><span className="font-medium">editor@demo.com</span> · Editor</div>
              <div><span className="font-medium">viewer@demo.com</span> · Viewer</div>
            </div>
            <div className="mt-1.5 text-[11px] opacity-60">Password: <code className="rounded bg-muted px-1 py-0.5">password</code></div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@example.com" className="rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" required placeholder="Enter password" className="rounded-lg" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-lg" disabled={loading}>
              {loading ? "Signing in\u2026" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
