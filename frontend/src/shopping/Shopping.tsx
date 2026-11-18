import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Home as HomeIcon,
  LogOut,
  ReceiptText,
  Settings2,
  ShoppingBasket,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  Button,
  ErrorMessage,
  Field,
  Input,
  Loading,
  Logo,
  Modal,
} from "../components/ui";
import { api, errorText, forgetCsrf } from "../lib/api";
import { announceLogout } from "../lib/sessionEvents";
import type { Page, Session } from "../lib/types";
import "./shopping.css";
import { Baskets, useBaskets } from "./Baskets";

export const categories: Record<string, string> = {
  FOOD: "Potraviny",
  HOUSEHOLD: "Domácnost",
  DRUGSTORE: "Drogerie",
  CLOTHING: "Oblečení",
  ELECTRONICS: "Elektronika",
  OTHER: "Ostatní",
};
type Item = {
  name: string;
  quantity: string;
  unit_price: string;
  total?: string;
};
type Purchase = {
  basket_id: string | null;
  id: string;
  store: string;
  date: string;
  total_amount: string;
  category: string;
  note: string;
  items: Item[];
  items_total: string;
  difference: string;
  author: string;
  can_edit: boolean;
  has_receipt: boolean;
  version: number;
};
type Summary = {
  month: string;
  count: number;
  total_amount: string;
  categories: {
    category: string;
    label: string;
    total_amount: string;
    count: number;
  }[];
  stores: { store: string; total_amount: string; count: number }[];
};
type Draft = { id: string; created_at: string };
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(
    new Date(),
  );
const money = (value: string) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(
    Number(value),
  );
const dateLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const imageUrl = (id: string, draft = false) =>
  `/api/v1/shopping/${draft ? `drafts/${id}/image/` : `purchases/${id}/receipt/`}`;
function CategorySelect({
  value,
  onChange,
  all = false,
}: {
  value: string;
  onChange: (value: string) => void;
  all?: boolean;
}) {
  return (
    <select
      id="category"
      className="input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {all && <option value="">Všechny kategorie</option>}
      {Object.entries(categories).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function ShoppingShell({ user }: { user: Session }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const admin = user.system_role === "ADMIN";
  return (
    <div className="shop-shell">
      <a className="skip-link" href="#main-content">
        Přejít k obsahu
      </a>
      <aside className="shop-sidebar">
        <Link to="/" className="logo-link">
          <Logo />
        </Link>
        <div className="shop-nav-label">RODINNÝ PROSTOR</div>
        <nav aria-label="Hlavní navigace">
          <NavLink to="/" end>
            <HomeIcon size={20} />
            Domů
          </NavLink>
          <NavLink to="/historie">
            <ReceiptText size={20} />
            Všechny nákupy
          </NavLink>
          <NavLink to="/uctenka">
            <CirclePlus size={20} />
            Přidat účtenku
          </NavLink>
          <NavLink to="/profil">
            <Settings2 size={20} />
            Můj profil
          </NavLink>
          {admin && (
            <NavLink to="/rodina">
              <UsersRound size={20} />
              Správa rodiny
            </NavLink>
          )}
        </nav>
        <div className="shop-sidebar-bottom">
          <div className="privacy-card">
            <ShoppingBasket size={28} />
            <strong>Každý nákup má své místo.</strong>
            <p>Účtenky a rodinné výdaje hezky pohromadě.</p>
          </div>
          {admin && (
            <div className="small-links">
              <Link to="/administrace/audit">Historie změn</Link>
              <Link to="/administrace/system">Stav systému</Link>
            </div>
          )}
          <div className="shop-user">
            <span className="shop-avatar">
              {(user.display_name || user.username).slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.display_name || user.username}</strong>
              <small>{admin ? "Správce rodiny" : "Člen rodiny"}</small>
            </div>
            <Button
              variant="ghost"
              aria-label="Odhlásit se"
              onClick={async () => {
                try {
                  await api("auth/logout/", { method: "POST" });
                  announceLogout();
                  client.clear();
                  forgetCsrf();
                  client.setQueryData(["session"], null);
                  navigate("/prihlaseni");
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
      <div className="shop-body">
        <header className="shop-topbar">
          <span>
            Malé nákupy. <strong>Velký přehled.</strong>
          </span>
          <div className="topbar-controls">
            <span className="family-pill">
              <UsersRound size={16} />
              Naše rodina
            </span>
            <Button
              className="mobile-signout"
              variant="ghost"
              aria-label="Odhlásit se"
              onClick={async () => {
                try {
                  await api("auth/logout/", { method: "POST" });
                  announceLogout();
                  client.clear();
                  forgetCsrf();
                  client.setQueryData(["session"], null);
                  navigate("/prihlaseni");
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="shop-main">
          <ErrorMessage>{error}</ErrorMessage>
          <Outlet />
        </main>
        <footer className="shop-footer">
          Rodinné nákupy <span>Váš soukromý přehled domácnosti</span>
        </footer>
      </div>
      <nav className="shop-mobile-nav" aria-label="Mobilní navigace">
        <NavLink end to="/">
          <HomeIcon size={20} />
          Domů
        </NavLink>
        <NavLink to="/historie">
          <ReceiptText size={20} />
          Nákupy
        </NavLink>
        <NavLink to="/uctenka">
          <CirclePlus size={20} />
          Přidat
        </NavLink>
        <NavLink to="/profil">
          <Settings2 size={20} />
          Profil
        </NavLink>
        {admin && (
          <NavLink to="/rodina">
            <UsersRound size={20} />
            Rodina
          </NavLink>
        )}
      </nav>
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  return (
    <Link className="purchase-row" to={`/historie/${purchase.id}`}>
      <span className={`store-icon category-${purchase.category}`}>
        <ShoppingBasket size={22} />
      </span>
      <span className="purchase-description">
        <strong>{purchase.store}</strong>
        <small>
          {dateLabel(purchase.date)} · {purchase.author}
        </small>
      </span>
      <span className="category-tag">{categories[purchase.category]}</span>
      <span className="purchase-amount">
        {money(purchase.total_amount)}
        <small>{purchase.has_receipt ? "S účtenkou" : "Ruční zápis"}</small>
      </span>
      <ChevronRight size={18} />
    </Link>
  );
}

export function Home() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const summary = useQuery({
    queryKey: ["summary", month],
    queryFn: () => api<Summary>(`shopping/summary/?month=${month}`),
  });
  const recent = useQuery({
    queryKey: ["recent"],
    queryFn: () => api<Page<Purchase>>("shopping/purchases/"),
  });
  const drafts = useQuery({
    queryKey: ["drafts"],
    queryFn: () => api<Draft[]>("shopping/drafts/"),
  });
  return (
    <>
      <div className="shop-page-heading">
        <div>
          <span className="eyebrow">VÍTEJTE DOMA</span>
          <h1>
            Nákupy pod kontrolou<span className="mint-dot">.</span>
          </h1>
          <p className="muted">Méně papírků. Více přehledu pro celou rodinu.</p>
        </div>
        <label className="month-picker">
          Období
          <input
            aria-label="Rok"
            className="input"
            type="number"
            min={1}
            max={9998}
            value={Number(month.slice(0, 4))}
            onChange={(event) => {
              const year = Number(event.target.value);
              if (Number.isInteger(year) && year >= 1 && year <= 9998)
                setMonth(String(year).padStart(4, "0") + month.slice(4));
            }}
          />
          <select
            className="input"
            aria-label="Měsíc"
            value={month.slice(5)}
            onChange={(event) =>
              setMonth(month.slice(0, 5) + event.target.value)
            }
          >
            {[
              "Leden",
              "Únor",
              "Březen",
              "Duben",
              "Květen",
              "Červen",
              "Červenec",
              "Srpen",
              "Září",
              "Říjen",
              "Listopad",
              "Prosinec",
            ].map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Baskets />
      <section className="shop-hero">
        <div>
          <span className="hero-kicker">
            <Sparkles size={16} />Z ÚČTENKY DO PŘEHLEDU
          </span>
          <h2>
            Nakoupeno?
            <br />
            Teď už jen vyfotit.
          </h2>
          <p>
            Přidejte účtenku, zkontrolujte údaje
            <br className="desktop-only" /> a zbytek nechte na přehledu.
          </p>
          <Link className="button button-primary" to="/uctenka">
            <Camera size={18} />
            Přidat účtenku
            <ArrowRight size={18} />
          </Link>
          <span className="hero-footnote">
            Nebo zapište nákup ručně. Stačí pár údajů.
          </span>
        </div>
        <div className="receipt-art" aria-hidden="true">
          <div className="art-bag">
            <ShoppingBasket size={85} strokeWidth={1.25} />
          </div>
          <div className="art-receipt">
            <span className="art-check">
              <Check size={20} />
            </span>
            <ShoppingBasket size={24} />
            <strong>RODINNÝ NÁKUP</strong>
            <span className="art-line" />
            <span className="art-line short" />
            <span className="art-line" />
            <span className="art-line short" />
            <div className="art-receipt-total">Vše hezky pohromadě</div>
            <div className="art-barcode" />
          </div>
          <span className="art-bubble">O papírek méně ✨</span>
        </div>
      </section>
      <ErrorMessage>
        {summary.error ? errorText(summary.error) : ""}
      </ErrorMessage>
      {summary.isPending ? (
        <Loading />
      ) : (
        summary.data && (
          <>
            <section className="summary-grid" aria-label="Měsíční souhrn">
              <article className="stat-card">
                <span>Celkem za měsíc</span>
                <strong>{money(summary.data.data.total_amount)}</strong>
                <small>Výdaje celé rodiny</small>
              </article>
              <article className="stat-card">
                <span>Společné nákupy</span>
                <strong>
                  {summary.data.data.count}
                  <small> účtenek a zápisů</small>
                </strong>
                <small>Všechny uložené nákupy v období</small>
              </article>
              <article className="stat-card lavender">
                <span>Váš rodinný archiv</span>
                <strong>
                  <ReceiptText size={30} />
                  Vždy po ruce
                </strong>
                <small>Soukromé účtenky na jednom místě</small>
              </article>
            </section>
            <div className="home-columns">
              <section className="shop-panel">
                <div className="section-title">
                  <h2>Poslední nákupy</h2>
                  <Link to="/historie">
                    Zobrazit vše <ArrowRight size={15} />
                  </Link>
                </div>
                {recent.isPending ? (
                  <Loading />
                ) : recent.error ? (
                  <ErrorMessage>{errorText(recent.error)}</ErrorMessage>
                ) : recent.data?.data.count ? (
                  recent.data.data.results
                    .slice(0, 5)
                    .map((p) => <PurchaseRow key={p.id} purchase={p} />)
                ) : (
                  <Empty
                    title="Váš první nákup čeká"
                    text="Přidejte účtenku nebo zapište nákup ručně. Tady potom najdete celou rodinnou historii."
                  />
                )}
              </section>
              <section className="shop-panel">
                <div className="section-title">
                  <h2>Za co utrácíme</h2>
                  <span className="subtle">Vybraný měsíc</span>
                </div>
                {summary.data.data.categories.length ? (
                  summary.data.data.categories.map((row) => (
                    <div className="category-summary" key={row.category}>
                      <div>
                        <span>{row.label}</span>
                        <strong>{money(row.total_amount)}</strong>
                      </div>
                      <div className="category-track">
                        <span
                          className={`category-${row.category}`}
                          style={{
                            width: `${Number(summary.data.data.total_amount) > 0 ? (Number(row.total_amount) / Number(summary.data.data.total_amount)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Zatím žádné výdaje"
                    text="Po uložení nákupu tu uvidíte rozdělení do kategorií."
                  />
                )}
              </section>
            </div>
          </>
        )
      )}
      {drafts.data?.data.length ? (
        <section className="shop-panel draft-panel">
          <h2>Rozpracované účtenky</h2>
          <p className="muted">
            Fotografie jsou uložené, údaje ještě čekají na kontrolu.
          </p>
          <div className="draft-grid">
            {drafts.data.data.map((draft) => (
              <Link key={draft.id} to={`/uctenka?draft=${draft.id}`}>
                <img
                  src={imageUrl(draft.id, true)}
                  alt="Rozpracovaná účtenka"
                />
                <span>
                  Dokončit zápis <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="shop-empty">
      <ReceiptText size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function History() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    search,
    category,
    page: String(page),
    ...(from ? { date_from: from } : {}),
    ...(to ? { date_to: to } : {}),
  });
  const result = useQuery({
    queryKey: ["purchases", search, category, from, to, page],
    queryFn: () => api<Page<Purchase>>(`shopping/purchases/?${params}`),
  });
  return (
    <>
      <div className="shop-page-heading">
        <div>
          <span className="eyebrow">RODINNÝ ARCHIV</span>
          <h1>Všechny nákupy</h1>
          <p className="muted">
            Každá účtenka má svůj příběh. Tady je najdete všechny.
          </p>
        </div>
        <Link className="button button-primary" to="/uctenka">
          <CirclePlus size={18} />
          Přidat nákup
        </Link>
      </div>
      <section className="shop-panel">
        <div className="purchase-filters">
          <Field id="search" label="Hledat obchod nebo poznámku">
            <Input
              id="search"
              placeholder="Například název obchodu…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field id="category" label="Kategorie">
            <CategorySelect
              all
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            />
          </Field>
          <Field id="from" label="Od">
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field id="to" label="Do">
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
        {result.isPending ? (
          <Loading />
        ) : result.error ? (
          <ErrorMessage>{errorText(result.error)}</ErrorMessage>
        ) : (
          <>
            {result.data.data.results.map((p) => (
              <PurchaseRow purchase={p} key={p.id} />
            ))}
            {!result.data.data.count && (
              <Empty
                title="Žádný nákup nenalezen"
                text="Zkuste jiné filtry nebo přidejte svůj první nákup."
              />
            )}
            <div className="pagination">
              <span>{result.data.data.count} nákupů</span>
              <div>
                <Button
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={17} />
                  Předchozí
                </Button>
                <span>{page}</span>
                <Button
                  variant="ghost"
                  disabled={!result.data.data.next}
                  onClick={() => setPage(page + 1)}
                >
                  Další
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export function PurchaseEditor() {
  const { id } = useParams();
  const existing = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => api<Purchase>(`shopping/purchases/${id}/`),
    enabled: !!id,
  });
  if (id && existing.isPending) return <Loading />;
  if (existing.error)
    return <ErrorMessage>{errorText(existing.error)}</ErrorMessage>;
  if (id && !existing.data?.data.can_edit)
    return (
      <ErrorMessage>
        Tento nákup může upravit jeho autor nebo správce.
      </ErrorMessage>
    );
  return <EditorForm key={id || "new"} existing={existing.data?.data} />;
}
function EditorForm({ existing }: { existing?: Purchase }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const baskets = useBaskets();
  const initialBasket = existing?.basket_id ?? params.get("basket") ?? "";
  const [basket, setBasket] = useState(initialBasket);
  const [draftId, setDraftId] = useState(params.get("draft") || "");
  const [step, setStep] = useState(existing || draftId ? 2 : 1);
  const [store, setStore] = useState(existing?.store || "");
  const [date, setDate] = useState(existing?.date || today());
  const [amount, setAmount] = useState(existing?.total_amount || "");
  const [category, setCategory] = useState(existing?.category || "FOOD");
  const [note, setNote] = useState(existing?.note || "");
  const [items, setItems] = useState<Item[]>(existing?.items || []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [uncertain, setUncertain] = useState(false);
  const [proposals, setProposals] = useState<Record<string, string>>({});
  const [ocrText, setOcrText] = useState("");
  function changed() {
    if (!uncertain) setRequestKey(crypto.randomUUID());
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (store || amount || items.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [store, amount, items.length]);
  const decimal = (value: string) => value.trim().replace(",", ".");
  return (
    <>
      <Link
        className="back-link"
        to={existing ? `/historie/${existing.id}` : "/"}
      >
        <ChevronLeft size={17} />
        Zpět
      </Link>
      <div className="shop-page-heading">
        <div>
          <span className="eyebrow">
            {existing ? "OPRAVA ZÁZNAMU" : "NOVÝ RODINNÝ NÁKUP"}
          </span>
          <h1>{existing ? "Upravit nákup" : "Přidat účtenku"}</h1>
          <p className="muted">
            {existing
              ? "Uložte opravené údaje do rodinné historie."
              : "Fotografie, pár údajů a máte hotovo."}
          </p>
        </div>
      </div>
      {!existing && (
        <ol className="wizard-steps">
          <li className={step >= 1 ? "active" : ""}>
            <span>1</span>Účtenka
          </li>
          <li className={step >= 2 ? "active" : ""}>
            <span>2</span>Kontrola údajů
          </li>
          <li>
            <span>3</span>Uloženo
          </li>
        </ol>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {step === 1 ? (
        <section className="shop-panel upload-panel">
          <span className="upload-camera">
            <Camera size={34} />
          </span>
          <h2>Papírová účtenka? Vyfoťte ji.</h2>
          <p className="muted">
            Vyberte fotografii z telefonu nebo ji rovnou pořiďte.
            <br />
            JPEG nebo PNG, nejvýše 10 MiB.
          </p>
          <label
            className={`button button-primary upload-button ${busy ? "disabled" : ""}`}
          >
            <Camera size={18} />
            {busy ? "Ukládám fotografii…" : "Vyfotit nebo vybrat účtenku"}
            <input
              aria-label="Fotografie účtenky"
              type="file"
              accept="image/jpeg,image/png"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setError("");
                if (file.size > 10 * 1024 * 1024) {
                  setError("Účtenka smí mít nejvýše 10 MiB.");
                  return;
                }
                setBusy(true);
                const body = new FormData();
                body.append("file", file);
                try {
                  const result = await api<{ id: string }>("shopping/drafts/", {
                    method: "POST",
                    body,
                  });
                  setDraftId(result.data.id);
                  setParams({ draft: result.data.id }, { replace: true });
                  setStep(2);
                  void client.invalidateQueries({ queryKey: ["drafts"] });
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <div className="upload-divider">nebo</div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setStep(2)}
          >
            Zapsat nákup ručně
            <ArrowRight size={17} />
          </Button>
          <p className="upload-note">
            Po nahrání můžete údaje navrhnout lokálním rozpoznáním nebo je
            vyplnit ručně.
          </p>
        </section>
      ) : (
        <form
          className="editor-layout"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const body = {
              store,
              date,
              total_amount: decimal(amount),
              category,
              note,
              ...(basket !== initialBasket || (!existing && basket)
                ? { basket_id: basket || null }
                : {}),
              items: items.map((item) => ({
                name: item.name,
                quantity: decimal(item.quantity),
                unit_price: decimal(item.unit_price),
              })),
            };
            try {
              const result = await api<Purchase>(
                existing
                  ? `shopping/purchases/${existing.id}/`
                  : "shopping/purchases/",
                {
                  method: existing ? "PATCH" : "POST",
                  body: existing
                    ? { ...body, version: existing.version }
                    : {
                        ...body,
                        request_key: requestKey,
                        ...(draftId ? { draft_id: draftId } : {}),
                      },
                },
              );
              await client.invalidateQueries();
              navigate(`/historie/${result.data.id}`, {
                replace: true,
                state: { saved: true },
              });
            } catch (err) {
              setError(errorText(err));
              if (
                err instanceof Error &&
                "status" in err &&
                (err as { status: number }).status === 0
              )
                setUncertain(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <section className="shop-panel editor-fields">
            <div className="section-title">
              <h2>Údaje o nákupu</h2>
              <span className="category-tag">CZK</span>
            </div>
            {uncertain && (
              <div className="alert">
                Výsledek uložení není známý. Zopakujte uložení se stejnými
                údaji; opakování nevytvoří druhý nákup.
              </div>
            )}
            <fieldset disabled={busy || uncertain} className="editor-fieldset">
              <div className="form-grid">
                <Field id="store" label="Obchod">
                  <Input
                    id="store"
                    value={store}
                    onChange={(e) => {
                      changed();
                      setStore(e.target.value);
                    }}
                    placeholder="Kde jste nakupovali?"
                    required
                    maxLength={150}
                  />
                </Field>
                <Field id="date" label="Datum nákupu">
                  <Input
                    id="date"
                    type="date"
                    max={today()}
                    value={date}
                    onChange={(e) => {
                      changed();
                      setDate(e.target.value);
                    }}
                    required
                  />
                </Field>
                <Field id="amount" label="Zaplacená částka (Kč)">
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => {
                      changed();
                      setAmount(e.target.value);
                    }}
                    required
                  />
                </Field>
                <Field id="purchase-basket" label="Nákupní košík">
                  <select
                    id="purchase-basket"
                    className="input"
                    value={basket}
                    onChange={(e) => {
                      changed();
                      setBasket(e.target.value);
                    }}
                  >
                    <option value="">Bez košíku</option>
                    {basket &&
                      !baskets.data?.data.some((b) => b.id === basket) && (
                        <option value={basket}>Vybraný košík</option>
                      )}
                    {baskets.data?.data.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="category" label="Kategorie">
                  <CategorySelect
                    value={category}
                    onChange={(v) => {
                      changed();
                      setCategory(v);
                    }}
                  />
                </Field>
              </div>
              <Field id="note" label="Poznámka (nepovinná)">
                <textarea
                  id="note"
                  className="input"
                  value={note}
                  maxLength={2000}
                  rows={3}
                  placeholder="Co si chcete k nákupu zapamatovat?"
                  onChange={(e) => {
                    changed();
                    setNote(e.target.value);
                  }}
                />
              </Field>
              <div className="section-title items-heading">
                <div>
                  <h2>Položky nákupu</h2>
                  <p className="muted">
                    Nepovinné. Pro rodinný přehled stačí celková částka.
                  </p>
                </div>
              </div>
              {items.map((item, index) => (
                <div className="item-editor" key={index}>
                  <Field id={`name-${index}`} label="Název">
                    <Input
                      id={`name-${index}`}
                      value={item.name}
                      required
                      maxLength={150}
                      onChange={(e) => {
                        changed();
                        setItems(
                          items.map((row, i) =>
                            i === index
                              ? { ...row, name: e.target.value }
                              : row,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Field id={`quantity-${index}`} label="Množství">
                    <Input
                      id={`quantity-${index}`}
                      inputMode="decimal"
                      value={item.quantity}
                      required
                      onChange={(e) => {
                        changed();
                        setItems(
                          items.map((row, i) =>
                            i === index
                              ? { ...row, quantity: e.target.value }
                              : row,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Field id={`price-${index}`} label="Cena za jednotku (Kč)">
                    <Input
                      id={`price-${index}`}
                      inputMode="decimal"
                      value={item.unit_price}
                      required
                      onChange={(e) => {
                        changed();
                        setItems(
                          items.map((row, i) =>
                            i === index
                              ? { ...row, unit_price: e.target.value }
                              : row,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Odebrat položku ${index + 1}`}
                    onClick={() => {
                      changed();
                      setItems(items.filter((_, i) => i !== index));
                    }}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                type="button"
                disabled={items.length >= 200}
                onClick={() => {
                  changed();
                  setItems([
                    ...items,
                    { name: "", quantity: "1", unit_price: "" },
                  ]);
                }}
              >
                <CirclePlus size={17} />
                Přidat položku
              </Button>
            </fieldset>
            <div className="save-actions">
              <p>Rozhodující je zaplacená částka z účtenky.</p>
              <Button type="submit" disabled={busy}>
                <Check size={18} />
                {busy ? "Ukládám…" : existing ? "Uložit změny" : "Uložit nákup"}
              </Button>
            </div>
          </section>
          <aside className="shop-panel receipt-preview">
            <h2>
              {draftId || existing?.has_receipt
                ? "Vaše účtenka"
                : "Ruční zápis"}
            </h2>
            {draftId || existing?.has_receipt ? (
              <>
                <a
                  href={imageUrl(draftId || existing!.id, !!draftId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={imageUrl(draftId || existing!.id, !!draftId)}
                    alt="Fotografie účtenky pro kontrolu údajů"
                  />
                </a>
                <p className="muted">Kliknutím otevřete větší náhled.</p>
                {draftId && (
                  <div className="ocr-tools">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || uncertain}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const result = await api<{
                            suggestions: Record<string, string>;
                            raw_text: string;
                          }>(`shopping/drafts/${draftId}/recognize/`, {
                            method: "POST",
                          });
                          setProposals(result.data.suggestions);
                          setOcrText(result.data.raw_text);
                        } catch (e) {
                          setError(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Sparkles size={16} />
                      Rozpoznat údaje
                    </Button>
                    <p className="muted">
                      Rozpoznání probíhá lokálně. Výsledek vždy zkontrolujte.
                    </p>
                    {Object.keys(proposals).length > 0 && (
                      <>
                        <dl className="ocr-proposals">
                          {Object.entries(proposals).map(([key, value]) => (
                            <div key={key}>
                              <dt>
                                {
                                  (
                                    {
                                      store: "Obchod",
                                      date: "Datum",
                                      total_amount: "Částka",
                                    } as Record<string, string>
                                  )[key]
                                }
                              </dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || uncertain}
                          onClick={() => {
                            changed();
                            if (proposals.store) setStore(proposals.store);
                            if (proposals.date) setDate(proposals.date);
                            if (proposals.total_amount)
                              setAmount(proposals.total_amount);
                            setProposals({});
                          }}
                        >
                          Použít návrhy ve formuláři
                        </Button>
                      </>
                    )}
                    {ocrText && (
                      <details>
                        <summary>Rozpoznaný text</summary>
                        <pre className="ocr-text">{ocrText}</pre>
                      </details>
                    )}
                    {ocrText && !Object.keys(proposals).length && (
                      <p className="muted">
                        Chybějící nebo nejednoznačné údaje doplňte ručně.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Empty
                title="Bez fotografie"
                text="Nákup můžete uložit i bez papírové účtenky."
              />
            )}
            {draftId && !uncertain && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`shopping/drafts/${draftId}/`, {
                      method: "DELETE",
                    });
                    setDraftId("");
                    setParams({}, { replace: true });
                    changed();
                    void client.invalidateQueries({ queryKey: ["drafts"] });
                  } catch (e) {
                    setError(errorText(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Odstranit fotografii
              </Button>
            )}
          </aside>
        </form>
      )}
    </>
  );
}

export function PurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => api<Purchase>(`shopping/purchases/${id}/`),
  });
  if (result.isPending) return <Loading />;
  if (result.error)
    return <ErrorMessage>{errorText(result.error)}</ErrorMessage>;
  const purchase = result.data.data;
  return (
    <>
      <Link className="back-link" to="/historie">
        <ChevronLeft size={17} />
        Všechny nákupy
      </Link>
      <div className="shop-page-heading">
        <div>
          <span className="eyebrow">DETAIL NÁKUPU</span>
          <h1>{purchase.store}</h1>
          <p className="muted">
            {dateLabel(purchase.date)} · Zapsal/a {purchase.author}
          </p>
        </div>
        {purchase.can_edit && (
          <div className="detail-actions">
            <Link
              className="button button-secondary"
              to={`/historie/${id}/upravit`}
            >
              Upravit nákup
            </Link>
            <Button variant="ghost" onClick={() => setConfirm(true)}>
              <Trash2 size={17} />
              Smazat
            </Button>
          </div>
        )}
      </div>
      <div className="editor-layout">
        <section className="shop-panel">
          <div className="detail-total">
            <span className="category-tag">
              {categories[purchase.category]}
            </span>
            <strong>{money(purchase.total_amount)}</strong>
            <span>Celkem zaplaceno</span>
          </div>
          {purchase.note && <p className="detail-note">{purchase.note}</p>}
          <h2>Položky nákupu</h2>
          {purchase.items.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Položka</th>
                      <th>Množství</th>
                      <th>Cena/jedn.</th>
                      <th>Celkem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity.replace(".", ",")}</td>
                        <td>{money(item.unit_price)}</td>
                        <td>{money(item.total!)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="items-total">
                Součet položek <strong>{money(purchase.items_total)}</strong>
              </p>
              {Number(purchase.difference) !== 0 && (
                <div className="difference-note">
                  Rozdíl oproti položkám:{" "}
                  <strong>{money(purchase.difference)}</strong>. Přehled používá
                  skutečně zaplacenou částku. Rozdíl může odpovídat slevě,
                  zaokrouhlení nebo nezadaným položkám.
                </div>
              )}
            </>
          ) : (
            <Empty
              title="Pouze celková částka"
              text="U tohoto nákupu nebyly jednotlivé položky zapsané."
            />
          )}
        </section>
        <aside className="shop-panel receipt-preview">
          <h2>Účtenka</h2>
          {purchase.has_receipt ? (
            <>
              <a href={imageUrl(purchase.id)} target="_blank" rel="noreferrer">
                <img
                  src={imageUrl(purchase.id)}
                  alt={`Účtenka z obchodu ${purchase.store}`}
                />
              </a>
              <a
                className="button button-secondary"
                href={imageUrl(purchase.id) + "?original=1"}
                target="_blank"
                rel="noreferrer"
              >
                Otevřít originál
              </a>
            </>
          ) : (
            <Empty
              title="Ruční zápis"
              text="Tento nákup je uložený bez fotografie účtenky."
            />
          )}
        </aside>
      </div>
      <Modal
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title="Smazat nákup?"
        description={`Nákup z obchodu ${purchase.store} za ${money(purchase.total_amount)} se odstraní včetně účtenky. Tuto akci nelze vrátit.`}
      >
        <ErrorMessage>{error}</ErrorMessage>
        <div className="save-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Zrušit
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`shopping/purchases/${id}/`, {
                  method: "DELETE",
                  body: { version: purchase.version },
                });
                await client.invalidateQueries();
                navigate("/historie");
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Mažu…" : "Smazat nákup"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
