import type { ReactNode } from "react";

export const metadata = {
  title: "Vivola",
  description: "Live surveys and quizzes for lectures",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
