import { lazy, Suspense, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Loading, Button, ErrorMessage } from "./components/ui";
import { errorText, forgetCsrf } from "./lib/api";
import { useSession } from "./lib/auth";
import { RouteFocus } from "./components/RouteFocus";
import { UpdateNotice } from "./components/UpdateNotice";
import { Warranties } from "./shopping/Warranties";
import { Bootstrap, setupStatus } from "./pages/Bootstrap";
const Login = lazy(() =>
  import("./pages/Login").then((m) => ({ default: m.Login })),
);
const ForcedPassword = lazy(() =>
  import("./pages/Password").then((m) => ({ default: m.ForcedPassword })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);
const Users = lazy(() =>
  import("./pages/Users").then((m) => ({ default: m.Users })),
);
const Audit = lazy(() =>
  import("./pages/AdminInfo").then((m) => ({ default: m.Audit })),
);
const System = lazy(() =>
  import("./pages/AdminInfo").then((m) => ({ default: m.System })),
);
import {
  ShoppingShell,
  Home,
  History,
  PurchaseEditor,
  PurchaseDetail,
} from "./shopping/Shopping";
function Theme({ value }: { value?: string }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      document.documentElement.classList.toggle(
        "dark",
        value === "DARK" || ((!value || value === "SYSTEM") && media.matches),
      );
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [value]);
  return null;
}

function LoginRoute() {
  const session = useSession();
  const installation = useQuery({
    queryKey: ["installation"],
    queryFn: setupStatus,
  });
  if (!session.data && installation.data?.data.available)
    return <Navigate to="/prvni-spusteni" replace />;
  if (session.isPending) return <Loading />;
  return session.data ? (
    <Navigate
      to={session.data.must_change_password ? "/zmena-hesla" : "/"}
      replace
    />
  ) : (
    <Login />
  );
}

function PasswordRoute() {
  const session = useSession();
  if (session.isPending) return <Loading />;
  if (!session.data) return <Navigate to="/prihlaseni" replace />;
  return session.data.must_change_password ? (
    <ForcedPassword />
  ) : (
    <Navigate to="/" replace />
  );
}

function AuthEvents() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const session = useSession();
  useEffect(() => {
    if (session.data === null)
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
  }, [session.data, client]);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("shoplog-session");
    channel.onmessage = (event) => {
      if (event.data === "logout") {
        client.clear();
        client.setQueryData(["session"], null);
        forgetCsrf();
        navigate("/prihlaseni", { replace: true });
      }
    };
    return () => channel.close();
  }, [client, navigate]);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        client.clear();
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [client]);
  useEffect(() => {
    const expired = (event: Event) => {
      if ((event as CustomEvent).detail === "password_change_required") {
        void client.invalidateQueries({ queryKey: ["session"] });
        navigate("/zmena-hesla", { replace: true });
      } else {
        client.clear();
        client.setQueryData(["session"], null);
        navigate("/prihlaseni", { replace: true });
      }
    };
    window.addEventListener("shoplog:session", expired);
    return () => window.removeEventListener("shoplog:session", expired);
  }, [client, navigate]);
  return null;
}

function Protected() {
  const session = useSession();
  if (session.isPending) return <Loading />;
  if (session.error)
    return (
      <main className="standalone">
        <ErrorMessage>{errorText(session.error)}</ErrorMessage>
        <Button onClick={() => session.refetch()}>Zkusit znovu</Button>
      </main>
    );
  if (!session.data) return <Navigate to="/prihlaseni" replace />;
  if (session.data.must_change_password)
    return <Navigate to="/zmena-hesla" replace />;
  return <ShoppingShell user={session.data} />;
}
function AdminOnly() {
  return useSession().data?.system_role === "ADMIN" ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}
export function App() {
  const session = useSession();
  return (
    <>
      <Theme value={session.data?.theme} />
      <AuthEvents />
      <RouteFocus />
      {(!session.data || session.data.must_change_password) && <UpdateNotice />}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/prvni-spusteni" element={<Bootstrap />} />
          <Route path="/prihlaseni" element={<LoginRoute />} />
          <Route path="/zmena-hesla" element={<PasswordRoute />} />
          <Route element={<Protected />}>
            <Route index element={<Home />} />
            <Route path="uctenka" element={<PurchaseEditor />} />
            <Route path="historie" element={<History />} />
            <Route path="historie/:id" element={<PurchaseDetail />} />
            <Route path="historie/:id/upravit" element={<PurchaseEditor />} />
            <Route path="zaruky" element={<Warranties />} />
            <Route path="profil" element={<Profile />} />
            <Route element={<AdminOnly />}>
              <Route path="rodina" element={<Users />} />
              <Route path="administrace/audit" element={<Audit />} />
              <Route path="administrace/system" element={<System />} />
            </Route>
            <Route
              path="*"
              element={
                <section className="panel">
                  <h1>Stránka nebyla nalezena</h1>
                  <Link to="/">Zpět domů</Link>
                </section>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
