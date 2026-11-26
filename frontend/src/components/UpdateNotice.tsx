import { useEffect, useState } from "react";
import { Button, Modal } from "./ui";

const CHECK_INTERVAL_MS = 60_000;

export function UpdateNotice({
  build = import.meta.env.VITE_APP_BUILD,
  reload = () => window.location.reload(),
}: { build?: string; reload?: () => void } = {}) {
  const [available, setAvailable] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!build) return;
    const controller = new AbortController();
    let pending = false;

    async function check() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch("/version.json", {
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const latest = await response.json();
        if (
          !controller.signal.aborted &&
          typeof latest?.build === "string" &&
          latest.build
        ) {
          setAvailable(latest.build !== build);
        }
      } catch {
        // Připojení se znovu ověří při návratu nebo při další pravidelné kontrole.
      } finally {
        pending = false;
      }
    }

    void check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [build]);

  if (!available) return null;
  return (
    <>
      <div className="app-update-notice">
        <span role="status">Je připravená nová verze rozhraní.</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirm(true)}
        >
          Načíst novou verzi
        </Button>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Načíst novou verzi?"
        description="Nejprve uložte rozpracované údaje. Obnovení stránky odstraní neuložený formulář."
      >
        <div className="app-update-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirm(false)}
          >
            Později
          </Button>
          <Button type="button" onClick={reload}>
            Obnovit aplikaci
          </Button>
        </div>
      </Modal>
    </>
  );
}
