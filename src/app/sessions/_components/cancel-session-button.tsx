"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this Session? Students won't be able to join it anymore.")) return;
    setCancelling(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.push("/sets");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleCancel} disabled={cancelling}>
      Cancel Session
    </button>
  );
}
