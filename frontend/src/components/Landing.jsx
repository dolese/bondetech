import { useState } from "react";
import { HomePage } from "./HomePage";
import { LoginPage } from "./LoginPage";

export function Landing({ onLogin }) {
  const [view, setView] = useState("home");

  if (view === "login") {
    return (
      <LoginPage
        onBack={() => setView("home")}
        onLogin={(creds) => {
          setView("home");
          onLogin?.(creds);
        }}
      />
    );
  }

  return <HomePage onOpenLogin={() => setView("login")} />;
}
