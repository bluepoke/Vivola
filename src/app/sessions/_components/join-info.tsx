import { generateJoinQrCodeSvg } from "@/lib/sessions/qrcode";
import { getBaseUrl } from "@/lib/http/base-url";

export async function JoinInfo({ joinCode }: { joinCode: string }) {
  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/join/${joinCode}`;
  const qrCodeSvg = await generateJoinQrCodeSvg(joinUrl);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
      <p>Join at {joinUrl}</p>
      <p style={{ fontSize: "2rem", letterSpacing: "0.2em" }}>{joinCode}</p>
    </div>
  );
}
