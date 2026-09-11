import Link from "next/link";
import { AuthForm } from "@/app/_components/auth-form";
import { SiteHeader } from "@/app/_components/site-header";

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-narrow">
        <h1>Create your Lecturer account</h1>
        <AuthForm endpoint="/api/auth/signup" submitLabel="Sign up" />
        <p className="text-muted">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </main>
    </>
  );
}
