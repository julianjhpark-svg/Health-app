import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Sign in — FormFit",
  description:
    "Sign in to FormFit to track your workouts and get AI-powered form coaching.",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/");
  }
  return <AuthForm />;
}
