import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin");
  }

  return (
    <Dashboard
      user={{
        name: session.user.name ?? null,
        email: session.user.email,
      }}
    />
  );
}
