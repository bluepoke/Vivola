import QRCode from "qrcode";

export async function generateJoinQrCodeSvg(joinUrl: string): Promise<string> {
  return QRCode.toString(joinUrl, { type: "svg", margin: 1 });
}
