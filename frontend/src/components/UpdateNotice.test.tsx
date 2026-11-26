import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { UpdateNotice } from "./UpdateNotice";

afterEach(() => vi.unstubAllGlobals());

const version = (build: string) =>
  new Response(JSON.stringify({ build }), {
    headers: { "Content-Type": "application/json" },
  });

it("nabídne jiné vydání po návratu a obnoví stránku po potvrzení", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(version("running"));
  const reload = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<UpdateNotice build="running" reload={reload} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(screen.queryByText("Je připravená nová verze rozhraní.")).toBeNull();
  fetch.mockResolvedValueOnce(version("next"));
  fireEvent.focus(window);

  const button = await screen.findByRole("button", {
    name: "Načíst novou verzi",
  });
  await userEvent.click(button);
  expect(screen.getByRole("dialog")).toHaveTextContent(/neuložený formulář/);
  await userEvent.click(screen.getByRole("button", { name: "Později" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(reload).not.toHaveBeenCalled();

  await userEvent.click(button);
  await userEvent.click(
    screen.getByRole("button", { name: "Obnovit aplikaci" }),
  );
  expect(reload).toHaveBeenCalledOnce();
});

it("po chybě sítě znovu ověří verzi po obnovení připojení", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline"));
  vi.stubGlobal("fetch", fetch);
  render(<UpdateNotice build="running" />);

  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(
    screen.queryByRole("button", { name: "Načíst novou verzi" }),
  ).toBeNull();
  fetch.mockResolvedValueOnce(version("next"));
  fireEvent(window, new Event("online"));
  expect(
    await screen.findByRole("button", { name: "Načíst novou verzi" }),
  ).toBeVisible();
});
