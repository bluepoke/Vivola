import { notFound, redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { NotFoundError, getSet } from "@/lib/sets/set-service";
import { SetDetail } from "@/app/sets/_components/set-detail";

export default async function SetPage({ params }: { params: Promise<{ setId: string }> }) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const { setId } = await params;

  try {
    const set = await getSet(lecturer.id, setId);
    return <SetDetail set={set} />;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
