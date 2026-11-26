import { Download } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button, Modal } from "./ui";

type InstallPrompt = Event & {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
};

const InstallContext = createContext<{
  installed: boolean;
  takePrompt(): InstallPrompt | null;
} | null>(null);

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const finish = () => {
      setPrompt(null);
      setInstalled(true);
    };
    sync();
    standalone.addEventListener("change", sync);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", finish);
    return () => {
      standalone.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", finish);
    };
  }, []);

  return (
    <InstallContext.Provider
      value={{
        installed,
        takePrompt() {
          setPrompt(null);
          return prompt;
        },
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const install = useContext(InstallContext);
  const [help, setHelp] = useState(false);

  if (install?.installed) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={async () => {
          const prompt = install?.takePrompt();
          if (prompt) {
            try {
              await prompt.prompt();
              return;
            } catch {
              // Prohlížeč už dialog nemusí mít k dispozici.
            }
          }
          setHelp(true);
        }}
      >
        <Download size={16} aria-hidden="true" /> Nainstalovat aplikaci
      </Button>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Nainstalovat aplikaci"
        description="Přidejte Rodinné nákupy na plochu z nabídky prohlížeče."
      >
        <p>
          <strong>iPhone nebo iPad (Safari):</strong> zvolte{" "}
          <strong>Sdílet → Přidat na plochu</strong>. Pokud se zobrazí volba{" "}
          <strong>Otevřít jako webovou aplikaci</strong>, zapněte ji.
        </p>
        <p>
          <strong>Android (Chrome):</strong> otevřete nabídku ⋮ a zvolte
          <strong> Přidat na plochu → Nainstalovat</strong>.
        </p>
      </Modal>
    </>
  );
}
