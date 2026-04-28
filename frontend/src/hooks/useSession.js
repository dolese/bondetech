import { useCallback, useEffect, useState } from "react";

const DEFAULT_ACCOUNT_STORAGE_KEY = "bonde-account-profile";

export function useSession({
  storageKey = DEFAULT_ACCOUNT_STORAGE_KEY,
  onLoginSuccess,
  onAccountSaved,
} = {}) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (currentUser) {
        window.localStorage.setItem(storageKey, JSON.stringify(currentUser));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Persistence is best-effort only.
    }
  }, [currentUser, storageKey]);

  const handleLogin = useCallback((creds = {}) => {
    const username = String(creds.username ?? "").trim() || "Operator";
    setCurrentUser((prev) => ({
      username,
      displayName: prev?.displayName || username,
      role: prev?.role || "School Administrator",
      email: prev?.email || "",
      phone: prev?.phone || "",
      rememberMe: Boolean(creds.rememberMe),
      loginAt: new Date().toISOString(),
    }));
    setLoggedIn(true);
    onLoginSuccess?.();
  }, [onLoginSuccess]);

  const handleSaveAccount = useCallback(async (updates) => {
    setCurrentUser((prev) => ({
      username: prev?.username || "Operator",
      displayName: prev?.displayName || prev?.username || "Operator",
      role: prev?.role || "School Administrator",
      email: prev?.email || "",
      phone: prev?.phone || "",
      ...updates,
    }));
    onAccountSaved?.();
  }, [onAccountSaved]);

  const handleLogout = useCallback(() => {
    setLoggedIn(false);
  }, []);

  return {
    currentUser,
    loggedIn,
    handleLogin,
    handleSaveAccount,
    handleLogout,
  };
}
