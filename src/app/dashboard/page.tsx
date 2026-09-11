import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { SiteHeader } from "@/app/_components/site-header";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function DashboardPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  return (
    <>
      <SiteHeader
        nav={
          <>
            <Link href="/sets">My Sets</Link>
            <Link href="/sessions">Past Sessions</Link>
            <LogoutButton />
          </>
        }
      />
      <main className="page">
        <h1>Dashboard</h1>
        <p className="text-muted">Logged in as {lecturer.email}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Link className="btn btn-primary" href="/sets">
            My Sets
          </Link>
          <Link className="btn btn-secondary" href="/sessions">
            Past Sessions
          </Link>
        </div>
      </main>
    </>
  );
}
