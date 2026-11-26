import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage, Field, Input, Loading } from "../components/ui";
import { api, errorText } from "../lib/api";
import type { Page } from "../lib/types";
import { categories, dateLabel, imageUrl } from "./Shopping";

type Warranty = {
  id: string;
  store: string;
  date: string;
  category: string;
  ends_on: string;
  status: "active" | "soon" | "expired";
  days_left: number;
  has_receipt: boolean;
  item_names: string[];
};

const statuses = {
  current: "Probíhající",
  soon: "Končí do 30 dnů",
  expired: "Po uplynutí",
  all: "Všechny",
};

function warrantyLabel(warranty: Warranty) {
  if (warranty.status === "expired") return "Po uplynutí";
  if (warranty.status === "active") return "Probíhá";
  if (warranty.days_left === 0) return "Končí dnes";
  if (warranty.days_left === 1) return "Končí zítra";
  return `Končí za ${warranty.days_left} ${warranty.days_left < 5 ? "dny" : "dní"}`;
}

export function Warranties() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "current";
  const page = Number(params.get("page")) || 1;
  const query = new URLSearchParams({
    search,
    category,
    status,
    page: String(page),
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  const result = useQuery({
    queryKey: ["warranties", search, category, status, page],
    queryFn: () => api<Page<Warranty>>(`shopping/warranties/?${query}`),
  });

  return (
    <>
      <div className="shop-page-heading">
        <div>
          <h1>Záruky</h1>
          <p className="muted">
            Přehled nákupů mimo kategorii Potraviny. Orientační konec počítáme
            jako dva roky od data nákupu.
          </p>
        </div>
      </div>
      <section className="shop-panel">
        <div className="purchase-filters warranty-filters">
          <Field id="warranty-search" label="Hledat obchod nebo poznámku">
            <Input
              id="warranty-search"
              maxLength={150}
              value={search}
              onChange={(e) => update("search", e.target.value)}
            />
          </Field>
          <Field id="warranty-category" label="Kategorie">
            <select
              id="warranty-category"
              className="input"
              value={category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">Všechny kategorie</option>
              {Object.entries(categories)
                .filter(([key]) => key !== "FOOD")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </Field>
          <Field id="warranty-status" label="Stav">
            <select
              id="warranty-status"
              className="input"
              value={status}
              onChange={(e) => update("status", e.target.value)}
            >
              {Object.entries(statuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {result.isPending ? (
          <Loading />
        ) : result.error ? (
          <ErrorMessage>{errorText(result.error)}</ErrorMessage>
        ) : (
          <>
            {result.data.data.results.length === 0 ? (
              <p className="muted">Tomuto výběru neodpovídá žádný nákup.</p>
            ) : (
              <ul className="warranty-list">
                {result.data.data.results.map((row) => (
                  <li className="warranty-row" key={row.id}>
                    <div className="warranty-purchase">
                      <Link to={`/historie/${row.id}`}>
                        <strong>{row.store}</strong>
                      </Link>
                      <span className="muted">
                        {categories[row.category]} · Nákup {dateLabel(row.date)}
                      </span>
                      {!!row.item_names.length && (
                        <span>
                          {row.item_names.slice(0, 3).join(", ")}
                          {row.item_names.length > 3 ? "…" : ""}
                        </span>
                      )}
                    </div>
                    <div className="warranty-time">
                      <span className={`category-tag warranty-${row.status}`}>
                        {warrantyLabel(row)}
                      </span>
                      <strong>Do {dateLabel(row.ends_on)}</strong>
                    </div>
                    {row.has_receipt ? (
                      <a
                        className="button button-secondary"
                        href={imageUrl(row.id)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Účtenka z obchodu ${row.store} (otevře se v nové kartě)`}
                      >
                        <ReceiptText size={16} aria-hidden="true" /> Účtenka
                      </a>
                    ) : (
                      <span className="muted">Bez přílohy</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {result.data.data.count > 0 && (
              <div className="pagination">
                <span>Počet nákupů: {result.data.data.count}</span>
                <div>
                  <button
                    className="button button-ghost"
                    disabled={page <= 1}
                    onClick={() => update("page", String(page - 1))}
                  >
                    Předchozí
                  </button>
                  <span>{page}</span>
                  <button
                    className="button button-ghost"
                    disabled={!result.data.data.next}
                    onClick={() => update("page", String(page + 1))}
                  >
                    Další
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
