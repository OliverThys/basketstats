import { useState } from "react";

import { useAuth } from "../../auth/AuthContext";

export function LoginScreen() {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim());
      } else {
        await register(orgName.trim(), email.trim(), displayName.trim());
      }
    } catch {
      // error already surfaced via useAuth().error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-frame">
      <div className="app-screen auth-screen">
        <header className="app-screen-header">
          <h1>BasketStats</h1>
        </header>

        <div className="auth-screen-body">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Se connecter
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Créer un club
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label>
                Nom du club
                <input
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  required
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {mode === "register" && (
              <label>
                Votre nom
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>
            )}
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="header-btn auth-submit" disabled={submitting}>
              {mode === "login" ? "Se connecter" : "Créer le club"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
