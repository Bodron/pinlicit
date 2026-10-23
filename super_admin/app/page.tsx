"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiUser = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: "user" | "seller" | "admin";
};

type SellerApplication = {
  id?: string;
  _id?: string;
  displayName: string;
  contactPhone: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  user?: ApiUser;
};

type Category = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
};

type AuthSession = {
  accessToken: string;
  user: ApiUser;
};

type OptimizedImage = {
  imageKey: string;
  imageUrl: string;
  sourceBytes: number;
  totalBytes: number;
};

type ViewMode = "approvals" | "listing";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

const tokenKey = "licit.superAdmin.accessToken";
const userKey = "licit.superAdmin.user";

export default function SuperAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [email, setEmail] = useState("admin@licit.local");
  const [password, setPassword] = useState("admin1234");
  const [mode, setMode] = useState<ViewMode>("approvals");

  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingListing, setSavingListing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [startingPrice, setStartingPrice] = useState("50");
  const [reservePrice, setReservePrice] = useState("200");
  const [minIncrement, setMinIncrement] = useState("5");
  const [buyNowPrice, setBuyNowPrice] = useState("250");
  const [durationDays, setDurationDays] = useState("7");

  const pendingCount = applications.length;
  const hasSession = Boolean(token && user);
  const canApprove = user?.role === "admin";
  const canCreateListing = user?.role === "seller" || user?.role === "admin";

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenKey);
    const storedUser = window.localStorage.getItem(userKey);
    if (!storedToken || !storedUser) return;

    try {
      const parsedUser = JSON.parse(storedUser) as ApiUser;
      setToken(storedToken);
      setUser(parsedUser);
      setMode(parsedUser.role === "admin" ? "approvals" : "listing");
    } catch {
      window.localStorage.removeItem(tokenKey);
      window.localStorage.removeItem(userKey);
    }
  }, []);

  useEffect(() => {
    if (!hasSession || !token) return;
    if (canApprove) void loadApplications(token);
    if (canCreateListing) void loadCategories(token);
  }, [hasSession, token, canApprove, canCreateListing]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await readJson(response)) as AuthSession;

      window.localStorage.setItem(tokenKey, data.accessToken);
      window.localStorage.setItem(userKey, JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);
      setMode(data.user.role === "admin" ? "approvals" : "listing");

      if (data.user.role === "admin") {
        await loadApplications(data.accessToken);
      }
      if (data.user.role === "seller" || data.user.role === "admin") {
        await loadCategories(data.accessToken);
      }
    } catch (exception) {
      setError(messageFrom(exception));
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(authToken = token) {
    if (!authToken) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/admin/seller-applications`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await readJson(response)) as SellerApplication[];
      setApplications(data);
    } catch (exception) {
      setError(messageFrom(exception));
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(authToken = token) {
    if (!authToken) return;

    try {
      const response = await fetch(`${apiBaseUrl}/categories`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await readJson(response)) as Category[];
      setCategories(data);
      setCategoryId((current) => current || categoryIdFrom(data[0]) || "");
    } catch (exception) {
      setError(messageFrom(exception));
    }
  }

  async function reviewApplication(
    application: SellerApplication,
    action: "approve" | "reject",
  ) {
    if (!token) return;
    const id = application.id ?? application._id;
    if (!id) {
      setError("Cererea nu are id valid.");
      return;
    }

    setBusyId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/admin/seller-applications/${id}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await readJson(response);
      setApplications((current) =>
        current.filter((item) => (item.id ?? item._id) !== id),
      );
      setSuccess(action === "approve" ? "Seller aprobat." : "Cerere respinsa.");
    } catch (exception) {
      setError(messageFrom(exception));
    } finally {
      setBusyId(null);
    }
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSavingListing(true);
    setError(null);
    setSuccess(null);

    try {
      if (!canCreateListing) {
        throw new Error("Contul tau nu are rol seller aprobat.");
      }
      if (!categoryId) {
        throw new Error("Alege o categorie.");
      }
      if (!imageFile) throw new Error("Alege o fotografie pentru anunț.");
      const extension = imageFile.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = (
        {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        } as Record<string, string>
      )[extension];
      if (
        !contentType ||
        imageFile.size < 1 ||
        imageFile.size > 10 * 1024 * 1024
      )
        throw new Error(
          "Folosește o fotografie JPG, PNG sau WebP de maximum 10 MB.",
        );
      const form = new FormData();
      form.append("image", imageFile);
      const uploadResponse = await fetch(`${apiBaseUrl}/uploads/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const optimized = (await readJson(uploadResponse)) as OptimizedImage;
      const imageKey = optimized.imageKey;
      const imageUrl = optimized.imageUrl;

      const now = new Date();
      const endsAt = new Date(
        now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000,
      );

      const productResponse = await fetch(`${apiBaseUrl}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          imageKey,
          imageUrl,
          startingPrice: ronToBani(startingPrice),
          reservePrice: ronToBani(reservePrice),
          minBidIncrement: ronToBani(minIncrement),
          buyNowPrice: ronToBani(buyNowPrice),
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      await readJson(productResponse);

      setTitle("");
      setDescription("");
      setImageFile(null);
      setStartingPrice("50");
      setReservePrice("200");
      setMinIncrement("5");
      setBuyNowPrice("250");
      setDurationDays("7");
      setSuccess("Produsul a fost listat cu succes.");
    } catch (exception) {
      setError(messageFrom(exception));
    } finally {
      setSavingListing(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(tokenKey);
    window.localStorage.removeItem(userKey);
    setToken(null);
    setUser(null);
    setApplications([]);
    setCategories([]);
    setMode("approvals");
  }

  const subtitle = useMemo(() => {
    if (!hasSession) return "Login cu admin sau seller pentru access.";
    if (mode === "listing")
      return "Listeaza rapid un produs cu fotografie in Licit.";
    if (pendingCount === 0) return "Nu exista cereri seller in asteptare.";
    return `${pendingCount} cereri seller asteapta review.`;
  }, [hasSession, mode, pendingCount]);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Licit Control</p>
          <h1>{mode === "listing" ? "Create listing" : "Seller approvals"}</h1>
          <p>{subtitle}</p>
        </div>
        {hasSession ? (
          <div className="admin-chip">
            <span>
              {user?.name ?? "User"} · {user?.role ?? "user"}
            </span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : null}
      </section>

      {hasSession ? (
        <nav className="tabs">
          {canApprove ? (
            <button
              className={mode === "approvals" ? "active" : ""}
              onClick={() => setMode("approvals")}
            >
              Seller approvals
            </button>
          ) : null}
          <button
            className={mode === "listing" ? "active" : ""}
            onClick={() => setMode("listing")}
          >
            Create product
          </button>
        </nav>
      ) : null}

      {error ? <div className="alert">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}

      {!hasSession ? (
        <LoginPanel
          email={email}
          loading={loading}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={login}
          password={password}
        />
      ) : mode === "listing" ? (
        <ListingPanel
          buyNowPrice={buyNowPrice}
          canCreateListing={canCreateListing}
          categories={categories}
          categoryId={categoryId}
          description={description}
          durationDays={durationDays}
          minIncrement={minIncrement}
          onBuyNowPriceChange={setBuyNowPrice}
          onCategoryChange={setCategoryId}
          onDescriptionChange={setDescription}
          onDurationDaysChange={setDurationDays}
          onMinIncrementChange={setMinIncrement}
          onReservePriceChange={setReservePrice}
          onStartingPriceChange={setStartingPrice}
          onSubmit={createListing}
          onTitleChange={setTitle}
          onImageFileChange={setImageFile}
          saving={savingListing}
          reservePrice={reservePrice}
          startingPrice={startingPrice}
          title={title}
          imageFile={imageFile}
        />
      ) : (
        <ApprovalsPanel
          applications={applications}
          busyId={busyId}
          loading={loading}
          onRefresh={() => void loadApplications()}
          onReview={reviewApplication}
        />
      )}
    </main>
  );
}

function LoginPanel({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="panel login-panel">
      <h2>Portal login</h2>
      <p className="muted">
        Adminul aproba selleri. Sellerul poate lista produse.
      </p>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => onPasswordChange(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </section>
  );
}

function ApprovalsPanel({
  applications,
  busyId,
  loading,
  onRefresh,
  onReview,
}: {
  applications: SellerApplication[];
  busyId: string | null;
  loading: boolean;
  onRefresh: () => void;
  onReview: (
    application: SellerApplication,
    action: "approve" | "reject",
  ) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Pending seller requests</h2>
          <p>Approve seller access only after checking identity and notes.</p>
        </div>
        <button className="secondary" disabled={loading} onClick={onRefresh}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <span>OK</span>
          <h3>Queue is clear</h3>
          <p>New seller applications will appear here automatically.</p>
        </div>
      ) : (
        <div className="request-list">
          {applications.map((application) => {
            const id =
              application.id ?? application._id ?? application.displayName;
            const sellerUser = application.user;
            const isBusy = busyId === (application.id ?? application._id);

            return (
              <article className="request-card" key={id}>
                <div className="request-main">
                  <div className="avatar">
                    {initials(application.displayName || sellerUser?.name)}
                  </div>
                  <div>
                    <div className="request-title-row">
                      <h3>{application.displayName}</h3>
                      <span className="status">{application.status}</span>
                    </div>
                    <p className="muted">
                      {sellerUser?.name ?? "Unknown user"} -{" "}
                      {sellerUser?.email ?? "No email"}
                    </p>
                    <p className="muted">
                      Contact:{" "}
                      {application.contactPhone || sellerUser?.phone || "-"}
                    </p>
                    {application.notes ? (
                      <p className="notes">{application.notes}</p>
                    ) : null}
                  </div>
                </div>
                <div className="request-meta">
                  <span>{formatDate(application.createdAt)}</span>
                  <div className="actions">
                    <button
                      className="reject"
                      disabled={isBusy}
                      onClick={() => onReview(application, "reject")}
                    >
                      Reject
                    </button>
                    <button
                      className="approve"
                      disabled={isBusy}
                      onClick={() => onReview(application, "approve")}
                    >
                      {isBusy ? "Saving..." : "Approve"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ListingPanel({
  buyNowPrice,
  canCreateListing,
  categories,
  categoryId,
  description,
  durationDays,
  minIncrement,
  onBuyNowPriceChange,
  onCategoryChange,
  onDescriptionChange,
  onDurationDaysChange,
  onMinIncrementChange,
  onReservePriceChange,
  onStartingPriceChange,
  onSubmit,
  onTitleChange,
  onImageFileChange,
  saving,
  reservePrice,
  startingPrice,
  title,
  imageFile,
}: {
  buyNowPrice: string;
  canCreateListing: boolean;
  categories: Category[];
  categoryId: string;
  description: string;
  durationDays: string;
  minIncrement: string;
  onBuyNowPriceChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDurationDaysChange: (value: string) => void;
  onMinIncrementChange: (value: string) => void;
  onReservePriceChange: (value: string) => void;
  onStartingPriceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onImageFileChange: (value: File | null) => void;
  saving: boolean;
  reservePrice: string;
  startingPrice: string;
  title: string;
  imageFile: File | null;
}) {
  if (!canCreateListing) {
    return (
      <section className="panel">
        <div className="empty-state">
          <span>!</span>
          <h3>Ai nevoie de rol seller</h3>
          <p>Trimite cererea din aplicatia mobila si asteapta aprobarea.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel listing-panel">
      <div className="panel-header">
        <div>
          <h2>Create product listing</h2>
          <p>
            Adauga produsul, fotografia de prezentare si regulile licitatiei.
          </p>
        </div>
      </div>

      <form className="listing-form" onSubmit={onSubmit}>
        <label className="upload-box">
          <input
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              onImageFileChange(event.target.files?.[0] ?? null)
            }
            type="file"
          />
          <strong>
            {imageFile ? imageFile.name : "Încarcă fotografia produsului"}
          </strong>
          <span>JPG, PNG sau WebP, maximum 10 MB.</span>
        </label>

        <div className="form-grid">
          <label>
            Titlu produs
            <input
              minLength={3}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Ceas vintage, camera Leica, artwork..."
              required
              value={title}
            />
          </label>
          <label>
            Categorie
            <select
              onChange={(event) => onCategoryChange(event.target.value)}
              required
              value={categoryId}
            >
              <option value="">Alege categoria</option>
              {categories.map((category) => (
                <option
                  key={categoryIdFrom(category)}
                  value={categoryIdFrom(category)}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Descriere
          <textarea
            minLength={10}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Descrie produsul, starea, provenienta si ce vede cumparatorul în fotografie."
            required
            rows={5}
            value={description}
          />
        </label>

        <div className="form-grid auction-rules">
          <label>
            Start RON
            <input
              min="0.01"
              onChange={(event) => onStartingPriceChange(event.target.value)}
              step="0.01"
              type="number"
              value={startingPrice}
            />
          </label>
          <label>
            Reserve RON
            <input
              min="0.01"
              onChange={(event) => onReservePriceChange(event.target.value)}
              step="0.01"
              type="number"
              value={reservePrice}
            />
          </label>
          <label>
            Pas RON
            <input
              min="0.01"
              onChange={(event) => onMinIncrementChange(event.target.value)}
              step="0.01"
              type="number"
              value={minIncrement}
            />
          </label>
          <label>
            Buy now RON
            <input
              min="0.01"
              onChange={(event) => onBuyNowPriceChange(event.target.value)}
              step="0.01"
              type="number"
              value={buyNowPrice}
            />
          </label>
          <label>
            Durata
            <select
              onChange={(event) => onDurationDaysChange(event.target.value)}
              value={durationDays}
            >
              {[3, 5, 7, 14, 30].map((days) => (
                <option key={days} value={days}>
                  {days} zile
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="auction-note">
          <strong>eBay-style bidding</strong>
          <span>
            Cumparatorii introduc suma maxima. Licit creste bidul public doar
            cat trebuie ca liderul sa ramana in fata. Reserve este minimul la
            care sellerul accepta vanzarea.
          </span>
        </div>

        <button disabled={saving} type="submit">
          {saving ? "Publishing..." : "Publish listing"}
        </button>
      </form>
    </section>
  );
}

async function readJson(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message;
    throw new Error(message ?? `Request failed with ${response.status}`);
  }

  return data;
}

function messageFrom(exception: unknown) {
  if (exception instanceof Error) return exception.message;
  return "A aparut o eroare.";
}

function initials(name?: string) {
  if (!name) return "SA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function categoryIdFrom(category?: Category) {
  return category?.id ?? category?._id ?? "";
}

function ronToBani(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}
