import Link from "next/link";
import { AuthForm } from "@/app/_components/auth-form";
import { SiteHeader } from "@/app/_components/site-header";

export default function LogInPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-narrow">
        <h1>Log in</h1>
        <AuthForm endpoint="/api/auth/login" submitLabel="Log in" />
        <p className="text-muted">
          Need an account? <Link href="/signup">Sign up</Link>
        </p>
      </main>
    </>
  );
}
