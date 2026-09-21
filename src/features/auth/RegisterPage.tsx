import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signUp } from "./useAuth";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const name = fullName.trim();
    const normalizedEmail = email.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(normalizedEmail, password, name);
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (needsEmailConfirmation) {
      setMessage("Account created. Check your email to confirm your account, then sign in.");
      return;
    }

    navigate("/app/dashboard", { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">CF</div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">Set up your ContentFlow workspace</p>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base">Get started</CardTitle>
          <CardDescription>Create your account to start managing content.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="full-name" autoComplete="name" required placeholder="Your name" className="pl-9" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="register-email" type="email" autoComplete="email" required placeholder="you@example.com" className="pl-9" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="register-password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" className="pl-9" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} placeholder="Re-enter your password" className="pl-9" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
            </div>

            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth/sign-in" className="font-medium text-foreground hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
