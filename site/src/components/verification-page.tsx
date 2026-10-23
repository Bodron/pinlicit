"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "./account-workspace";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { money } from "@/lib/catalog";
import {
  applicationLabels,
  type SellerApplicationView,
} from "@/lib/verification";
export function VerificationPage() {
  const { data, now, error: accountError, refresh, refreshing } = useAccount();
  const [applications, setApplications] = useState<
    SellerApplicationView[] | null
  >(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState("all");
  const [pageState, setPage] = useState({ filter: "all", page: 1 });
  const [info, setInfo] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const key = `${now}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/verification", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) {
          setApplications(result.applications);
          setError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(key);
      });
    return () => controller.abort();
  }, [now, revision, key]);
  if (!data) return null;
  const loading = key !== loadedKey;
  const user = data.user;
  const role =
    user.role === "seller"
      ? "Vânzător"
      : user.role === "admin"
        ? "Administrator"
        : "Cumpărător";
  const active = data.positions?.filter(
    (p) => p.product.status === "active" && Date.parse(p.product.endsAt) > now,
  );
  const totalMax = active?.reduce((sum, p) => sum + p.maxAmount, 0);
  const latest = applications?.[0];
  const selected = (applications ?? []).filter(
    (a) => filter === "all" || a.status === filter,
  );
  const pages = Math.max(1, Math.ceil(selected.length / 8));
  const page = Math.min(
    pages,
    pageState.filter === filter ? pageState.page : 1,
  );
  const rows = selected.slice((page - 1) * 8, page * 8);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("ro-RO", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Europe/Bucharest",
        }).format(new Date(value))
      : "—";
  function reload() {
    setRevision((value) => value + 1);
    void refresh();
  }
  return (
    <>
      <div className="verification-content">
        <section className="verification-heading">
          <div>
            <span className="verification-ribbon">
              <Icon name="user" size={15} />
              Contul tău Pinbind
            </span>
            <h1>Verificare și datele contului</h1>
            <p>
              Consultă datele profilului, rolul contului și cererile pentru
              accesul de vânzător. Informațiile afișate provin din contul tău.
            </p>
          </div>
          <div className="verification-auth-badge">
            <span>
              <Icon name="shield" size={24} />
            </span>
            <div>
              <strong>Sesiune autentificată</strong>
              <span>
                {user.name} · {role}
              </span>
            </div>
          </div>
        </section>
        <section className="verification-metrics">
          <article className="verification-primary">
            <div>
              <Icon name="user" size={20} />
              <span>Rolul contului</span>
              <span className="verification-tag">Din profil</span>
            </div>
            <strong>{role}</strong>
            <p>
              {user.role === "seller"
                ? "Contul tău are rol de vânzător în platformă."
                : user.role === "admin"
                  ? "Contul tău are rol de administrator în platformă."
                  : "Contul tău are rol de cumpărător. Accesul de vânzător se solicită din aplicație."}
            </p>
            <div className="verification-role-detail">
              <span>Email adăugat</span>
              <b>{user.email}</b>
            </div>
            <div className="verification-card-actions">
              <Link
                className="button button-primary"
                href="/cont?section=profile"
              >
                Vezi profilul
                <Icon name="arrow" size={15} />
              </Link>
              <button onClick={() => setInfo("Accesul de vânzător")}>
                Despre rolul de vânzător
              </button>
            </div>
          </article>
          <article>
            <div>
              <Icon name="shield" size={20} />
              <span>Plăți și solduri</span>
            </div>
            <strong className="verification-unavailable-value">
              Indisponibile
            </strong>
            <p>
              Soldurile, depozitele escrow și transferurile bancare nu sunt
              disponibile în versiunea actuală a site-ului.
            </p>
            <div className="verification-unavailable-box">
              <Icon name="list" size={25} />
              <div>
                <b>Fără date financiare conectate</b>
                <span>Nu sunt afișate limite de credit sau sume bancare.</span>
              </div>
            </div>
            <button
              className="button verification-secondary"
              onClick={() => setInfo("Plăți și solduri")}
            >
              Despre această secțiune
            </button>
          </article>
          <article className="verification-bids-summary">
            <div>
              <span>Participări active</span>
              <Icon name="gavel" size={20} />
            </div>
            <strong>{active?.length ?? "—"}</strong>
            <p>
              {totalMax !== undefined
                ? `${money(totalMax)} · suma maximelor tale ofertate, nu un sold sau bani blocați.`
                : "Ofertele nu au putut fi încărcate."}
            </p>
            <div className="verification-bid-list">
              {active?.slice(0, 3).map((position) => (
                <Link
                  key={position.product._id}
                  href={`/anunturi/${position.product._id}`}
                >
                  <span>{position.product.title}</span>
                  <b>{money(position.maxAmount)}</b>
                </Link>
              ))}
              {active?.length === 0 && <span>Nu ai participări active.</span>}
            </div>
            <Link href="/cont/oferte" className="verification-inline-link">
              Oferte și istoric
              <Icon name="arrow" size={15} />
            </Link>
          </article>
        </section>
        {(error || accountError) && (
          <div className="account-error" role="alert">
            {error || accountError}
            <button onClick={reload}>Reîncearcă</button>
          </div>
        )}
        <section className="verification-details-grid">
          <div>
            <div className="verification-section-title">
              <div>
                <h2>Datele declarate în profil</h2>
                <p>Informații de contact asociate contului tău.</p>
              </div>
              <Icon name="user" size={23} />
            </div>
            <div className="verification-profile-card">
              {[
                { label: "Nume", value: user.name, icon: "user" as const },
                { label: "Email", value: user.email, icon: "user" as const },
                {
                  label: "Telefon",
                  value: user.phone || "Neadăugat",
                  icon: "user" as const,
                },
                {
                  label: "Rol în platformă",
                  value: role,
                  icon: "gavel" as const,
                },
              ].map((item) => (
                <div key={item.label} className="verification-profile-row">
                  <span>
                    <Icon name={item.icon} size={21} />
                  </span>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <span>
                    {item.label === "Telefon" && !user.phone
                      ? "Lipsește"
                      : "Adăugat"}
                  </span>
                </div>
              ))}
              <p className="verification-note">
                Prezența acestor date în profil nu reprezintă o verificare a
                identității sau o certificare KYC.
              </p>
              <button
                className="button verification-secondary"
                onClick={() => window.print()}
              >
                <Icon name="list" size={17} />
                Tipărește rezumatul contului
              </button>
            </div>
          </div>
          <div>
            <div className="verification-section-title">
              <div>
                <h2>Accesul de vânzător</h2>
                <p>Rolul actual și istoricul cererilor tale.</p>
              </div>
              <button
                className="button button-primary"
                onClick={() => setInfo("Accesul de vânzător")}
              >
                Cum solicit acces?
              </button>
            </div>
            <div className="verification-access-card">
              <span>
                <Icon name="gavel" size={25} />
              </span>
              <div>
                <h3>Rol actual: {role}</h3>
                <p>Rolul este preluat din profilul contului.</p>
              </div>
              <span className="verification-tag">Pinbind</span>
            </div>
            <div className="verification-access-card">
              <span>
                <Icon name="list" size={25} />
              </span>
              <div>
                <h3>Ultima cerere</h3>
                <p>
                  {latest
                    ? `${applicationLabels[latest.status]} · ${date(latest.createdAt)}`
                    : applications
                      ? "Nu ai cereri înregistrate."
                      : loading
                        ? "Se încarcă cererile…"
                        : "Date indisponibile."}
                </p>
              </div>
              {latest && (
                <span
                  className={`verification-application-status ${latest.status}`}
                >
                  {applicationLabels[latest.status]}
                </span>
              )}
            </div>
            <div className="verification-access-card is-unavailable">
              <span>
                <Icon name="shield" size={25} />
              </span>
              <div>
                <h3>Verificare de identitate și conturi bancare</h3>
                <p>
                  Verificarea KYC, biometria și conectarea conturilor bancare nu
                  sunt disponibile în această versiune web.
                </p>
              </div>
            </div>
            <div className="verification-information">
              <Icon name="image" size={24} />
              <p>
                Cererile pentru contul de vânzător se trimit din aplicația
                Pinbind. Poți urmări starea lor aici; aprobarea unei cereri de
                vânzător nu este o acreditare financiară.
              </p>
            </div>
          </div>
        </section>
        <section className="verification-history">
          <div className="verification-section-title">
            <div>
              <h2>Istoricul cererilor de vânzător</h2>
              <p>Cererile înregistrate în cont și starea evaluării lor.</p>
            </div>
            <div
              className="verification-history-filters"
              role="group"
              aria-label="Filtrează cererile"
            >
              {[
                { id: "all", label: "Toate" },
                { id: "pending", label: "În analiză" },
                { id: "approved", label: "Aprobate" },
                { id: "rejected", label: "Respinse" },
              ].map((item) => (
                <button
                  key={item.id}
                  aria-pressed={filter === item.id}
                  className={filter === item.id ? "selected" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="verification-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data cererii</th>
                  <th>Referință</th>
                  <th>Tipul cererii</th>
                  <th>Stare</th>
                  <th>Data evaluării</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application) => (
                  <tr key={application.id}>
                    <td>{date(application.createdAt)}</td>
                    <td className="verification-reference">
                      #{application.id.slice(-8).toUpperCase()}
                    </td>
                    <td>Acces cont de vânzător</td>
                    <td>
                      <span
                        className={`verification-application-status ${application.status}`}
                      >
                        {applicationLabels[application.status]}
                      </span>
                    </td>
                    <td>{date(application.reviewedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="verification-empty" role="status">
                <Icon name={error ? "refresh" : "list"} size={29} />
                <p>
                  {applications === null
                    ? loading
                      ? "Se încarcă cererile…"
                      : "Istoricul nu este disponibil momentan."
                    : filter === "all"
                      ? "Nu ai cereri de vânzător înregistrate."
                      : "Nu sunt cereri cu această stare."}
                </p>
              </div>
            )}
            <div className="verification-table-footer">
              <span>
                {applications
                  ? `${selected.length} cereri în selecție`
                  : "Date indisponibile"}
              </span>
              <div>
                <button
                  disabled={page === 1}
                  onClick={() => setPage({ filter, page: page - 1 })}
                >
                  Anterior
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button
                  disabled={page === pages}
                  onClick={() => setPage({ filter, page: page + 1 })}
                >
                  Următor
                </button>
              </div>
            </div>
          </div>
        </section>
        <div className="account-update-line">
          <span>
            {refreshing || loading
              ? "Se actualizează…"
              : "Datele se actualizează la 30 secunde când fila este vizibilă."}
          </span>
          <button onClick={reload}>
            <Icon name="refresh" size={14} />
            Actualizează
          </button>
        </div>
        {info && (
          <Dialog title={info} onClose={() => setInfo("")}>
            <div className="info-content">
              <Icon
                name={info === "Plăți și solduri" ? "shield" : "gavel"}
                size={38}
              />
              <p>
                {info === "Plăți și solduri"
                  ? "Site-ul nu oferă momentan operațiuni de depunere, retragere sau conectare bancară. Sumele din istoricul ofertelor reprezintă maximele ofertate la produse și nu sunt solduri bancare sau fonduri blocate."
                  : "Deschide aplicația Pinbind și intră în secțiunea Vinde. Completează cererea pentru contul de vânzător și urmărește starea ei aici. Rolul de vânzător este acordat după aprobarea cererii."}
              </p>
              <button
                className="button button-primary"
                onClick={() => setInfo("")}
              >
                Am înțeles
              </button>
            </div>
          </Dialog>
        )}
      </div>
      <section className="watch-print">
        <h1>Rezumat cont Pinbind</h1>
        <p>{date(new Date(now).toISOString())} · Ora României</p>
        <table>
          <tbody>
            <tr>
              <th>Nume</th>
              <td>{user.name}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{user.email}</td>
            </tr>
            <tr>
              <th>Telefon</th>
              <td>{user.phone || "Neadăugat"}</td>
            </tr>
            <tr>
              <th>Rol</th>
              <td>{role}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Date declarate în profil. Acest rezumat nu reprezintă o certificare de
          identitate, KYC sau financiară.
        </p>
      </section>
    </>
  );
}
