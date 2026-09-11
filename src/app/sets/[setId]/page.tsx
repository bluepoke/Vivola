import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { NotFoundError, getSet } from "@/lib/sets/set-service";
import { SetDetail } from "@/app/sets/_components/set-detail";
import { SiteHeader } from "@/app/_components/site-header";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function SetPage({ params }: { params: Promise<{ setId: string }> }) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const { setId } = await params;

  try {
    const set = await getSet(lecturer.id, setId);
    return (
      <>
        <SiteHeader
          nav={
            <>
              <Link href="/sets" aria-current="page">
                My Sets
              </Link>
              <Link href="/sessions">Past Sessions</Link>
              <LogoutButton />
            </>
          }
        />
        <SetDetail set={set} />
      </>
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
