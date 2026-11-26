import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { InstallAppButton, InstallAppProvider } from "./InstallApp";

it("otevře dialog prohlížeče a po instalaci tlačítko skryje", async () => {
  const prompt = vi.fn().mockResolvedValue({ outcome: "accepted" });
  render(
    <InstallAppProvider>
      <InstallAppButton />
    </InstallAppProvider>,
  );
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    { prompt },
  );
  fireEvent(window, event);
  expect(event.defaultPrevented).toBe(true);
  await userEvent.click(
    screen.getByRole("button", { name: "Nainstalovat aplikaci" }),
  );
  expect(prompt).toHaveBeenCalledOnce();
  fireEvent(window, new Event("appinstalled"));
  expect(
    screen.queryByRole("button", { name: "Nainstalovat aplikaci" }),
  ).toBeNull();
});

it("bez instalačního dialogu ukáže postup pro Safari", async () => {
  render(
    <InstallAppProvider>
      <InstallAppButton />
    </InstallAppProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Nainstalovat aplikaci" }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Sdílet → Přidat na plochu",
  );
});
