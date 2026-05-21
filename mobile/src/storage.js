import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "bonde-mobile-auth-token";

export async function getStoredMobileToken() {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) || "";
}

export async function storeMobileToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, String(token || ""));
}

export async function clearStoredMobileToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
