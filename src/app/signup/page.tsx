import Link from "next/link";
import { AuthForm } from "@/app/_components/auth-form";

export default function SignUpPage() {
  return (
    <main>
      <h1>Create your Lecturer account</h1>
      <AuthForm endpoint="/api/auth/signup" submitLabel="Sign up" />
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
