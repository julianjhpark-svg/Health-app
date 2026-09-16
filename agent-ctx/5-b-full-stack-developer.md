# Task 5-b — Auth Frontend (full-stack-developer)

Task: /signin page (sign in + create account), header user menu, dashboard user prop threading. Code against the 5-a auth backend contract; do not create API routes.

## Files created
- src/app/signin/page.tsx — server wrapper: getServerSession(authOptions) from "@/lib/auth" (5-a); session → redirect("/"); else <AuthForm/>. Metadata set.
- src/app/signin/auth-form.tsx — client: hero-grid-bg centered Card max-w-md, ThemeToggle absolute top-4 right-4, logo row, dynamic h1 ("Welcome back"/"Create your account"), controlled Tabs h-11 (signin/create), rhf+zod forms (log-activity-dialog style, no any), inline destructive Alerts (no toasts), demo hint box + Fill button (demo@formfit.app / demo1234), footer disclaimer. signIn<"credentials"> redirect:false → ok: push("/") + refresh(); "CredentialsSignin" → "Invalid email or password."; create tab POSTs /api/auth/register, 409 → auto-switch to signin prefilled + notice, 400 → server {error} Alert, 201 → immediate signIn then push+refresh.
- src/components/dashboard/user-menu.tsx — exports DashboardUser type + UserMenu (avatar w/ deterministic colored initials, sm+ name text hidden on mobile, DropdownMenu: bold name fallback "Athlete", truncated email, separator, destructive "Sign out" → signOut({ callbackUrl: "/signin" })). Trigger: ghost size-11 button, aria-label "Account menu".

## Files modified
- src/components/dashboard/header.tsx — user?: renders UserMenu; null: outline h-11 "Sign in" (LogIn, router.push("/signin"), label hidden <420px) BEFORE Log Activity. Tagline chip untouched.
- src/components/dashboard/dashboard.tsx — `Dashboard({ user = null }: { user?: DashboardUser | null })` → `<Header user={user} onLogClick={openLog} />`. Rest unchanged.

## Integration notes
- Orchestrator should pass `user` to <Dashboard/> from getServerSession on the "/" server page: `{ name: session.user?.name ?? null, email: session.user?.email ?? "" } | null`. Prop is optional so current page.tsx still compiles.
- next-auth v4 typing quirk: use `signIn<"credentials">("credentials", {...})` to get SignInResponse; no SessionProvider anywhere.
- Pending 5-a: "@/lib/auth" (authOptions) + POST /api/auth/register. Until landing: GET /signin 500s with single "Can't resolve '@/lib/auth'" error; register 404 — both expected, auto-resolve when backend lands.

## Quality
- bun run lint → exit 0 (0 errors/warnings). tsc --noEmit → only expected @/lib/auth miss + pre-existing api/analyses vision-body typing (not mine). Icons: Activity, LogIn, LogOut, Info, Loader2, Dumbbell, AlertTriangle (verified in lucide 0.525 / prior worklog).
