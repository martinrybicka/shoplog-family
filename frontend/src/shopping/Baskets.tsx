import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, ErrorMessage, Field, Input, Modal } from "../components/ui";
import { api, errorText } from "../lib/api";

type Member = { id: string; name: string };
type Basket = {
  id: string;
  name: string;
  shopping_list: string;
  assignees: Member[];
  purchases: { id: string; store: string; amount: string; author: string }[];
};

export function useBaskets() {
  return useQuery({
    queryKey: ["shopping-baskets"],
    queryFn: () => api<Basket[]>("shopping/baskets/"),
  });
}

export function Baskets() {
  const baskets = useBaskets();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const members = useQuery({
    queryKey: ["basket-members"],
    queryFn: () => api<Member[]>("shopping/basket-members/"),
    enabled: open,
  });
  return (
    <section className="shop-panel basket-panel">
      <div className="section-title">
        <h2>Nákupní košíky</h2>
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          Vytvořit nákupní košík
        </Button>
      </div>
      <ErrorMessage>
        {baskets.error ? errorText(baskets.error) : ""}
      </ErrorMessage>
      {baskets.data?.data.map((basket) => (
        <article className="basket-card" key={basket.id}>
          <h3>{basket.name}</h3>
          <p>
            {basket.assignees.length
              ? basket.assignees.map((m) => m.name).join(", ")
              : "Vlastní košík"}
          </p>
          {basket.shopping_list && (
            <p className="basket-list">{basket.shopping_list}</p>
          )}
          <Link
            className="button button-secondary"
            to={`/uctenka?basket=${basket.id}`}
          >
            Přidat účtenku
          </Link>
          {basket.purchases.length > 0 && (
            <details>
              <summary>Nákupy a účtenky ({basket.purchases.length})</summary>
              <ul>
                {basket.purchases.map((p) => (
                  <li key={p.id}>
                    <Link to={`/historie/${p.id}`}>
                      {p.store} · {p.author} ·{" "}
                      {Number(p.amount).toLocaleString("cs-CZ", {
                        style: "currency",
                        currency: "CZK",
                      })}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
      {baskets.data?.data.length === 0 && (
        <p className="muted">Zatím nemáte žádný košík.</p>
      )}
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Nový nákupní košík"
        description="Pojmenujte košík a vyberte, kdo může přidávat účtenky."
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              await api("shopping/baskets/", {
                method: "POST",
                body: {
                  name: data.get("name"),
                  shopping_list: data.get("shopping_list"),
                  assignee_ids: data.getAll("assignee_ids"),
                },
              });
              await client.invalidateQueries({
                queryKey: ["shopping-baskets"],
              });
              setOpen(false);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field id="basket-name" label="Název košíku">
            <Input id="basket-name" name="name" required maxLength={150} />
          </Field>
          <Field id="shopping-list" label="Co nakoupit (volitelné)">
            <textarea
              className="input"
              id="shopping-list"
              name="shopping_list"
              maxLength={4000}
              rows={3}
            />
          </Field>
          <fieldset>
            <legend>Kdo bude nakupovat</legend>
            {members.isPending && <p>Načítám členy…</p>}
            <ErrorMessage>
              {members.error ? errorText(members.error) : ""}
            </ErrorMessage>
            {members.data?.data.map((m) => (
              <label className="basket-member" key={m.id}>
                <input name="assignee_ids" type="checkbox" value={m.id} />{" "}
                {m.name}
              </label>
            ))}
            {members.data?.data.length === 0 && (
              <p>V rodině zatím nejsou další aktivní členové.</p>
            )}
          </fieldset>
          <ErrorMessage>{error}</ErrorMessage>
          <Button disabled={busy || members.isPending || !!members.error}>
            {busy ? "Ukládám…" : "Vytvořit košík"}
          </Button>
        </form>
      </Modal>
    </section>
  );
}
