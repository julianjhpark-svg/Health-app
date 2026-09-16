"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Dumbbell,
  Info,
  Loader2,
  LogIn,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FadeIn } from "@/components/dashboard/fade-in";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEMO_EMAIL = "demo@formfit.app";
const DEMO_PASSWORD = "demo1234";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailField = z
  .string()
  .min(1, "Email is required")
  .refine((v) => EMAIL_RE.test(v.trim()), "Enter a valid email address");

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});
type SignInValues = z.infer<typeof signInSchema>;

const createSchema = z.object({
  name: z.string().max(60, "Keep your name under 60 characters"),
  email: emailField,
  password: z.string().min(8, "At least 8 characters"),
});
type CreateValues = z.infer<typeof createSchema>;

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function SignInForm({
  prefillEmail,
  notice,
}: {
  prefillEmail: string;
  notice: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: prefillEmail, password: "" },
  });
  const errors = form.formState.errors;
  const bannerMessage = serverError ?? notice;

  React.useEffect(() => {
    if (prefillEmail) {
      form.setValue("email", prefillEmail, { shouldDirty: true });
    }
  }, [prefillEmail, form]);

  function fillDemo() {
    form.setValue("email", DEMO_EMAIL, { shouldDirty: true });
    form.setValue("password", DEMO_PASSWORD, { shouldDirty: true });
    form.clearErrors();
    setServerError(null);
  }

  async function onSubmit(values: SignInValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await signIn<"credentials">("credentials", {
        redirect: false,
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (!res || res.error || res.ok !== true) {
        setServerError(
          res?.error === "CredentialsSignin"
            ? "Invalid email or password."
            : "Could not sign you in. Please try again."
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-4"
      noValidate
    >
      {bannerMessage && <ErrorAlert message={bannerMessage} />}

      <div className="grid gap-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "signin-email-error" : undefined}
          {...form.register("email")}
        />
        {errors.email && (
          <p id="signin-email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? "signin-password-error" : undefined
          }
          {...form.register("password")}
        />
        {errors.password && (
          <p id="signin-password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="size-4" aria-hidden="true" />
        )}
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
        <Info
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Try the demo account —{" "}
          <span className="font-medium text-foreground">{DEMO_EMAIL}</span> /{" "}
          <span className="font-medium text-foreground">{DEMO_PASSWORD}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={fillDemo}
        >
          Fill
        </Button>
      </div>
    </form>
  );
}

function CreateAccountForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: (email: string, message?: string) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: CreateValues) {
    setServerError(null);
    setSubmitting(true);
    const email = values.email.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim() ? values.name.trim() : undefined,
          email,
          password: values.password,
        }),
      });

      if (res.status === 409) {
        onSwitchToSignIn(
          email,
          "An account with this email already exists. Try signing in."
        );
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error || "Could not create your account. Please try again."
        );
      }

      // Registered — sign the user in immediately (same credentials).
      const signInRes = await signIn<"credentials">("credentials", {
        redirect: false,
        email,
        password: values.password,
      });
      if (!signInRes || signInRes.error || signInRes.ok !== true) {
        onSwitchToSignIn(email, "Account created — please sign in to continue.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-4"
      noValidate
    >
      {serverError && <ErrorAlert message={serverError} />}

      <div className="grid gap-2">
        <Label htmlFor="create-name">
          Name{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="create-name"
          type="text"
          autoComplete="name"
          maxLength={60}
          placeholder="Alex Chen"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "create-name-error" : undefined}
          {...form.register("name")}
        />
        {errors.name && (
          <p id="create-name-error" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="create-email">Email</Label>
        <Input
          id="create-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "create-email-error" : undefined}
          {...form.register("email")}
        />
        {errors.email && (
          <p id="create-email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="create-password">Password</Label>
        <Input
          id="create-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? "create-password-error" : "create-password-hint"
          }
          {...form.register("password")}
        />
        <p id="create-password-hint" className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        {errors.password && (
          <p id="create-password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Dumbbell className="size-4" aria-hidden="true" />
        )}
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function AuthForm() {
  const [tab, setTab] = React.useState<"signin" | "create">("signin");
  const [prefillEmail, setPrefillEmail] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const switchToSignIn = React.useCallback(
    (email: string, message?: string) => {
      setPrefillEmail(email.trim().toLowerCase());
      if (message) setNotice(message);
      setTab("signin");
    },
    []
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background hero-grid-bg">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <FadeIn className="w-full max-w-md">
          <Card className="gap-5 py-6 sm:py-8">
            <CardHeader className="items-center gap-2 text-center">
              <div className="flex items-center justify-center gap-2.5">
                <div className="rounded-xl bg-primary/10 p-2" aria-hidden="true">
                  <ActivityIcon className="size-5 text-primary" />
                </div>
                <span className="text-lg font-bold tracking-tight">FormFit</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {tab === "create" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tab === "create"
                  ? "Start logging workouts and get AI form coaching."
                  : "Sign in to keep your training on track."}
              </p>
            </CardHeader>

            <CardContent>
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as "signin" | "create")}
              >
                <TabsList className="h-11 w-full">
                  <TabsTrigger value="signin" className="px-3">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="create" className="px-3">
                    Create account
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-6">
                  <SignInForm prefillEmail={prefillEmail} notice={notice} />
                </TabsContent>
                <TabsContent value="create" className="mt-6">
                  <CreateAccountForm onSwitchToSignIn={switchToSignIn} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-6 px-2 text-center text-xs text-muted-foreground">
            By continuing you agree to use FormFit for general fitness guidance
            — not medical advice.
          </p>
        </FadeIn>
      </main>
    </div>
  );
}
