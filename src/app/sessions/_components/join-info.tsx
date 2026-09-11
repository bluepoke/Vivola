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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div
        className="qr-frame"
        style={{ width: 220, border: "2px solid var(--color-text)", padding: 12, background: "#fff" }}
        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
      />
      <p className="text-muted" style={{ margin: 0 }}>
        Join at {joinUrl}
      </p>
      <p
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: "2rem",
          letterSpacing: "0.2em",
          margin: 0,
        }}
      >
        {joinCode}
      </p>
      <StudentCount sessionId={sessionId} initialCount={studentCount} />
    </div>
  );
}
