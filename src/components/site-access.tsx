import { Input, Label } from "@/components/ui/input";

export type SiteAccess = {
  loginUrl: string;
  username: string;
  password: string;
  sessionCookies: string;
};

export function SiteAccessFields({
  value,
  onChange,
  disabled,
}: {
  value: SiteAccess;
  onChange: (next: SiteAccess) => void;
  disabled?: boolean;
}) {
  return (
    <details className="rounded-2xl border border-border px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">Pages behind a login</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs leading-relaxed text-muted">
          Optional. Sign in with the account that can see those pages, or paste the cookie after you log in
          yourself. Nexora then opens the pages that session can see, including ones linked from buttons.
          A captcha still has to be solved by you.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="access-login">Login page</Label>
          <Input
            id="access-login"
            type="url"
            disabled={disabled}
            placeholder="https://yourcompany.com/login"
            value={value.loginUrl}
            onChange={(e) => onChange({ ...value, loginUrl: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="access-user">Email or username</Label>
            <Input
              id="access-user"
              autoComplete="off"
              disabled={disabled}
              value={value.username}
              onChange={(e) => onChange({ ...value, username: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="access-pass">Password</Label>
            <Input
              id="access-pass"
              type="password"
              autoComplete="new-password"
              disabled={disabled}
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-cookie">Or session cookie</Label>
          <Input
            id="access-cookie"
            autoComplete="off"
            disabled={disabled}
            placeholder="name=value; name2=value2"
            value={value.sessionCookies}
            onChange={(e) => onChange({ ...value, sessionCookies: e.target.value })}
          />
        </div>
      </div>
    </details>
  );
}

export const emptyAccess: SiteAccess = { loginUrl: "", username: "", password: "", sessionCookies: "" };
