import { useCallback, useEffect, useState } from "react";
import { HomePage } from "./Home/HomePage";
import { LoginPage } from "./LoginPage";
import { PublicLegalPage } from "./PublicLegalPage";

function getLandingViewFromPath(pathname = "/") {
  if (pathname === "/login") return "login";
  if (pathname === "/terms") return "terms";
  if (pathname === "/privacy") return "privacy";
  return "home";
}

function getPathForView(view) {
  if (view === "login") return "/login";
  if (view === "terms") return "/terms";
  if (view === "privacy") return "/privacy";
  return "/";
}

export function Landing({ onLogin }) {
  const [view, setView] = useState(() =>
    typeof window === "undefined" ? "home" : getLandingViewFromPath(window.location.pathname)
  );

  const navigateToView = useCallback((nextView, { replace = false } = {}) => {
    const nextPath = getPathForView(nextView);
    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", nextPath);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    setView(nextView);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => {
      setView(getLandingViewFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (view === "login") {
    return (
      <LoginPage
        onBack={() => navigateToView("home")}
        onOpenTerms={() => navigateToView("terms")}
        onOpenPrivacy={() => navigateToView("privacy")}
        onLogin={async (creds) => {
          const result = await onLogin?.(creds);
          navigateToView("home", { replace: true });
          return result;
        }}
      />
    );
  }

  if (view === "terms" || view === "privacy") {
    return (
      <PublicLegalPage
        type={view}
        onBackHome={() => navigateToView("home")}
        onOpenLogin={() => navigateToView("login")}
      />
    );
  }

  return (
    <HomePage
      onOpenLogin={() => navigateToView("login")}
      onOpenTerms={() => navigateToView("terms")}
      onOpenPrivacy={() => navigateToView("privacy")}
    />
  );
}
