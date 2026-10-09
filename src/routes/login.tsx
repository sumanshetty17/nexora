import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { getSignInOptions } from "@/lib/auth/sign-in-options";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [broker, setBroker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSignInOptions()
      .then((opts) => {
        if (!cancelled) setBroker(opts.broker);
      })
      .catch(() => {
        if (!cancelled) setBroker(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-ink/10" />
      </main>
    );
  }
  if (user) return <Navigate to="/app" />;

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "Owner",
          callbackURL: "/app",
        });
        if (res.error) throw new Error(res.error.message || "Could not create the account.");
      } else {
        const res = await authClient.signIn.email({ email, password, callbackURL: "/app" });
        if (res.error) throw new Error(res.error.message || "Could not sign in.");
      }
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function onBroker(providerId: string) {
    setError(null);
    setPending(true);
    try {
      await signIn(providerId, { callbackURL: "/app", forceBroker: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <Link to="/">
          <BrandMark />
        </Link>
        <h1 className="mt-6 font-display text-3xl tracking-tight">
          {mode === "in" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "in"
            ? "Sign in with email to train assistants, read insights, and handle email."
            : "A workspace for every site you want to put an assistant on."}
        </p>

        {authEnabled ? (
          <>
            {broker ? (
              <div className="mt-6 grid gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void onBroker(p.providerId)}
                  >
                    Continue with {p.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-ink/5 px-4 py-3 text-sm text-muted">
                Google and X sign-in can't return to this public address. Use email and password —
                it stays on this site.
              </p>
            )}
            {broker ? (
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-border" />
                or email
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <form className={broker ? "space-y-3" : "mt-6 space-y-3"} onSubmit={(e) => void onEmail(e)}>
              {mode === "up" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Please wait…" : mode === "in" ? "Continue" : "Create account"}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 text-sm text-muted hover:text-ink"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
