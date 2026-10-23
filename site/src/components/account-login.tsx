"use client";
import { useState, type FormEvent } from "react";
import { Icon } from "./icon";
export function AccountLogin({
  onLogin,
  unavailable,
}: {
  onLogin: () => Promise<void>;
  unavailable: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError("");
    const values = new FormData(form);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.get("email"),
          password: values.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      form.reset();
      await onLogin();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Autentificarea nu a reușit.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="account-login">
      <div>
        <span className="eyebrow">Spațiul tău Pinbind</span>
        <h1>
          Toate descoperirile tale,
          <br />
          într-un singur loc.
        </h1>
        <p>
          Intră în contul pe care îl folosești în aplicație pentru a vedea
          ofertele, favoritele și anunțurile tale.
        </p>
        <div className="account-login-features">
          <span>
            <Icon name="gavel" />
            Urmărește ofertele tale
          </span>
          <span>
            <Icon name="heart" />
            Regăsește produsele preferate
          </span>
          <span>
            <Icon name="video" />
            Vezi anunțurile publicate
          </span>
        </div>
      </div>
      <form onSubmit={submit}>
        <Icon name="user" size={34} />
        <h2>Autentificare</h2>
        <p>Folosește datele contului tău Pinbind.</p>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            placeholder="nume@exemplu.ro"
          />
        </label>
        <label>
          Parolă
          <span className="account-password">
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={256}
            />
            <button
              type="button"
              aria-label={show ? "Ascunde parola" : "Arată parola"}
              aria-pressed={show}
              onClick={() => setShow((value) => !value)}
            >
              {show ? "Ascunde" : "Arată"}
            </button>
          </span>
        </label>
        {(error || unavailable) && (
          <p className="account-error" role="alert">
            {error || "Platforma nu răspunde momentan. Încearcă din nou."}
          </p>
        )}
        <button className="button button-primary" disabled={pending}>
          {pending ? "Se verifică…" : "Intră în cont"}
          <Icon name="arrow" size={17} />
        </button>
        <span className="account-small">
          Nu ai cont? Îl poți crea în aplicația Pinbind.
        </span>
      </form>
    </section>
  );
}
