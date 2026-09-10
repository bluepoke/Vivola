import { generateJoinQrCodeSvg } from "@/lib/sessions/qrcode";
import { getBaseUrl } from "@/lib/http/base-url";
import { getStudentCount } from "@/lib/students/student-service";
import { StudentCount } from "@/app/sessions/_components/student-count";

export async function JoinInfo({ sessionId, joinCode }: { sessionId: string; joinCode: string }) {
  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/join/${joinCode}`;
  const [qrCodeSvg, studentCount] = await Promise.all([
    generateJoinQrCodeSvg(joinUrl),
    getStudentCount(sessionId),
  ]);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
      <p>Join at {joinUrl}</p>
      <p style={{ fontSize: "2rem", letterSpacing: "0.2em" }}>{joinCode}</p>
      <StudentCount sessionId={sessionId} initialCount={studentCount} />
    </div>
  );
}
