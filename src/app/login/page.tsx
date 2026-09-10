import Link from "next/link";
import { AuthForm } from "@/app/_components/auth-form";

export default function LogInPage() {
  return (
    <main>
      <h1>Log in</h1>
      <AuthForm endpoint="/api/auth/login" submitLabel="Log in" />
      <p>
        Need an account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
