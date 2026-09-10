import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function DashboardPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Logged in as {lecturer.email}</p>
      <p>
        <Link href="/sets">My Sets</Link>
      </p>
      <LogoutButton />
    </main>
  );
}
