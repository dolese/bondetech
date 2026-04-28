import { useCallback, useEffect, useState } from "react";
import { API, clearStoredAuthToken, getStoredAuthToken, storeAuthToken } from "../api";

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
  const [loggedIn, setLoggedIn] = useState(Boolean(getStoredAuthToken()));
  const [authReady, setAuthReady] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);

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

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setLoggedIn(false);
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    API.getSession()
      .then(({ user }) => {
        setCurrentUser(user);
        setLoggedIn(true);
      })
      .catch(() => {
        clearStoredAuthToken();
        setCurrentUser(null);
        setLoggedIn(false);
      })
      .finally(() => setAuthReady(true));
  }, []);

  const handleLogin = useCallback(async (creds = {}) => {
    const result = await API.login({
      username: creds.username,
      password: creds.password,
      rememberMe: Boolean(creds.rememberMe),
    });
    storeAuthToken(result.token, Boolean(creds.rememberMe));
    setCurrentUser(result.user);
    setLoggedIn(true);
    onLoginSuccess?.(result.user);
    return result;
  }, [onLoginSuccess]);

  const handleSaveAccount = useCallback(async (updates) => {
    const result = await API.updateMyProfile(updates);
    setCurrentUser(result.user);
    onAccountSaved?.();
    return result.user;
  }, [onAccountSaved]);

  const handleChangePassword = useCallback(async (currentPassword, newPassword) => {
    await API.changeMyPassword({ currentPassword, newPassword });
  }, []);

  const loadUsers = useCallback(async () => {
    const result = await API.listUsers();
    setManagedUsers(result.users ?? []);
    return result.users ?? [];
  }, []);

  const handleCreateUser = useCallback(async (payload) => {
    const result = await API.createUser(payload);
    setManagedUsers((prev) => [...prev, result.user].sort((a, b) => a.username.localeCompare(b.username)));
    return result.user;
  }, []);

  const handleUpdateUser = useCallback(async (username, payload) => {
    const result = await API.updateUser(username, payload);
    setManagedUsers((prev) => prev.map((user) => (user.username === username ? result.user : user)));
    if (currentUser?.username === username) {
      setCurrentUser(result.user);
    }
    return result.user;
  }, [currentUser?.username]);

  const handleLogout = useCallback(() => {
    clearStoredAuthToken();
    setManagedUsers([]);
    setCurrentUser(null);
    setLoggedIn(false);
  }, []);

  return {
    currentUser,
    loggedIn,
    authReady,
    managedUsers,
    handleLogin,
    handleSaveAccount,
    handleChangePassword,
    loadUsers,
    handleCreateUser,
    handleUpdateUser,
    handleLogout,
  };
}
