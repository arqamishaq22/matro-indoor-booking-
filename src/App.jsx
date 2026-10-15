import React, { useEffect } from "react";
import {
  Link,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { hideToast } from "./features/booking/bookingSlice";
import { fetchMe, selectAuthToken } from "./features/auth/authSlice";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/* Pages */
import Home from "./pages/Home";
import VenuesPage from "./pages/VenuesPage";
import VenueDetailPage from "./pages/VenueDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import OverviewPage from "./pages/admin/OverviewPage";
import BookingsPage from "./pages/admin/BookingsPage";
import AdminVenuesPage from "./pages/admin/VenuesPage";
import PricingPage from "./pages/admin/PricingPage";
import UsersPage from "./pages/admin/UsersPage";

/* Route guards */
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute from "./components/common/AdminRoute";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Container from "./components/common/Container";

/* Global modal */
import BookingModal from "./components/booking/BookingModal";

/* ─── Toast config ───────────────────────────────────────────────────── */
const TOAST_CONFIG = {
  success: { Icon: CheckCircle2, colorVar: "var(--brand-primary)" },
  error: { Icon: AlertCircle, colorVar: "var(--brand-danger)" },
  info: { Icon: Info, colorVar: "var(--brand-secondary)" },
};

function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="flex min-h-[60vh] flex-1 items-center py-16"
      >
        <Container>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
            <span className="section-eyebrow">404 · Page not found</span>
            <h1 className="text-3xl font-extrabold">
              We couldn’t find that page.
            </h1>
            <p>
              Check the address or return to Matro to find a venue and book a
              court.
            </p>
            <Link to="/" className="btn-cta">
              Back to Home
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function App() {
  const dispatch = useDispatch();
  const toast = useSelector((state) => state.booking?.toast);
  const token = useSelector(selectAuthToken);
  const location = useLocation();
  const navigate = useNavigate();

  /*
   * Session restore: on mount (and whenever the token changes after a
   * login/register), if a token is present but the user object has not
   * been loaded yet, re-validate via /auth/me.
   *
   * BUG FIX (BUG 2): The original code had TWO useEffects.  The first one
   * checked `token && !isLoggedIn`, but selectIsLoggedIn is defined as
   * Boolean(token), so whenever token is truthy, isLoggedIn is also truthy
   * — making that condition permanently false.  That effect was dead code.
   * Removed it.
   *
   * BUG FIX (BUG 9): The second effect ran on every token change, including
   * when logout() sets token to null, which would dispatch fetchMe() with
   * no token (harmless but wasteful and confusing).  Guard added.
   */
  useEffect(() => {
    if (token) {
      dispatch(fetchMe());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const sectionId = location.state?.scrollToSection;
    if (location.pathname !== "/" || !sectionId) return undefined;

    const root = document.getElementById("root");
    if (!root) return undefined;

    let observer;
    const scrollWhenReady = () => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      observer.disconnect();
      navigate("/", { replace: true, state: null });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const navHeight =
            document.querySelector("header")?.offsetHeight ?? 72;
          window.scrollTo({
            top:
              section.getBoundingClientRect().top +
              window.scrollY -
              navHeight -
              8,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
          });
        });
      });
    };

    observer = new MutationObserver(scrollWhenReady);
    observer.observe(root, { childList: true, subtree: true });
    scrollWhenReady();

    return () => observer.disconnect();
  }, [location.key, location.pathname, location.state, navigate]);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast?.show) return;
    const timer = setTimeout(() => dispatch(hideToast()), 5000);
    return () => clearTimeout(timer);
  }, [toast?.show, dispatch]);

  const toastCfg = TOAST_CONFIG[toast?.type] ?? TOAST_CONFIG.info;

  return (
    <div className="matro-app-root">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* ── Routes ────────────────────────────────── */}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/venues" element={<VenuesPage />} />
        <Route path="/venues/:venueId" element={<VenueDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected — authenticated users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected — admin only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="venues" element={<AdminVenuesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<OverviewPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* ── Global Booking Modal ─────────────────── */}
      <BookingModal />

      {/* ── Global Toast ─────────────────────────── */}
      {toast?.show && (
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className={[
            "toast-container",
            toast.type === "error" ? "toast-error" : "",
          ]
            .join(" ")
            .trim()}
        >
          <toastCfg.Icon
            size={18}
            color={toastCfg.colorVar}
            aria-hidden="true"
            className="shrink-0"
          />
          <span className="text-[length:var(--text-sm)] font-[var(--fw-medium)] flex-1 leading-[var(--lh-sm)]">
            {toast.message}
          </span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dispatch(hideToast())}
            className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-[var(--radius-xs)] bg-transparent border-none text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
