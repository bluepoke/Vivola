import QRCode from "qrcode";

const QR_CODE_SIZE_PX = 240;

export async function generateJoinQrCodeSvg(joinUrl: string): Promise<string> {
  // Without an explicit width/height, the SVG has only a viewBox and no
  // intrinsic size, which browsers can render far larger than intended.
  return QRCode.toString(joinUrl, { type: "svg", margin: 1, width: QR_CODE_SIZE_PX });
}
