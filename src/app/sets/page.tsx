import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { listSets } from "@/lib/sets/set-service";
import { CreateSetForm } from "@/app/sets/_components/create-set-form";

export default async function SetsPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const sets = await listSets(lecturer.id);

  return (
    <main>
      <h1>My Sets</h1>
      <ul>
        {sets.map((set) => (
          <li key={set.id}>
            <Link href={`/sets/${set.id}`}>{set.title}</Link>
            {" — "}
            {set.type === "SURVEY" ? "Survey Set" : "Question Set"}
            {" — "}
            {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
          </li>
        ))}
      </ul>

      <h2>Create a new Set</h2>
      <CreateSetForm />
    </main>
  );
}
