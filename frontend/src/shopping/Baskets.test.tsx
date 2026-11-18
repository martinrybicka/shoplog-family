import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import * as apiModule from "../lib/api";
import { Baskets } from "./Baskets";

it("nabízí potraviny, přidává prázdný řádek a ukládá pouze vyplněné položky", async () => {
  const calls = vi
    .spyOn(apiModule, "api")
    .mockImplementation(async () => ({ data: [], etag: null }) as never);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Baskets />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Vytvořit nákupní košík" }),
  );
  await user.type(screen.getByLabelText("Název košíku"), "Rodinný nákup");
  await user.type(screen.getByLabelText("Položka 1"), "Káva");
  await user.click(
    screen.getByRole("button", { name: "Vybrat potravinu pro položku 2" }),
  );
  const foods = screen.getByRole("group", {
    name: "Základní potraviny pro položku 2",
  });
  expect(within(foods).getAllByRole("button")).toHaveLength(20);
  await user.click(within(foods).getByRole("button", { name: "Mléko" }));
  expect(screen.getByLabelText("Položka 2")).toHaveValue("Mléko");
  expect(screen.getByLabelText("Položka 3")).toHaveValue("");
  await user.click(
    await screen.findByRole("button", { name: "Vytvořit košík" }),
  );
  await waitFor(() =>
    expect(calls).toHaveBeenCalledWith(
      "shopping/baskets/",
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Rodinný nákup",
          shopping_list: "Káva\nMléko",
        }),
      }),
    ),
  );
});
