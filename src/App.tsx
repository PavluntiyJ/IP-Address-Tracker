import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { LookupResult } from "../shared/lookup";
import { lookupAddress } from "./api";
import { MapPanel } from "./MapPanel";

type LoadState = "loading" | "success" | "error";

const detailLabels = ["IP address", "Location", "Timezone", "Network"] as const;

function locationLabel(result: LookupResult) {
  return [
    result.location.city,
    result.location.region,
    result.location.postalCode,
    result.location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  async function runLookup(search: string) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoadState("loading");
    setError("");

    try {
      const nextResult = await lookupAddress(search, controller.signal);
      setResult(nextResult);
      setLoadState("success");
    } catch (lookupError) {
      if (controller.signal.aborted) return;
      setLoadState("error");
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "An unexpected lookup error occurred.",
      );
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    void lookupAddress("", controller.signal)
      .then((initialResult) => {
        if (controller.signal.aborted) return;
        setResult(initialResult);
        setLoadState("success");
      })
      .catch((lookupError: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState("error");
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : "An unexpected lookup error occurred.",
        );
      });

    return () => controllerRef.current?.abort();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!search) {
      setLoadState("error");
      setError("Enter an IP address or domain to begin a search.");
      return;
    }
    void runLookup(search);
  }

  const details = result
    ? [
        result.ip,
        locationLabel(result) || "Location unavailable",
        result.location.timezone
          ? `UTC ${result.location.timezone}`
          : "Timezone unavailable",
        result.isp,
      ]
    : ["Scanning...", "Resolving...", "Calculating...", "Identifying..."];
  const isLoading = loadState === "loading";

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__grid" aria-hidden="true" />
        <nav className="topbar" aria-label="Primary navigation">
          <a className="brand" href="/" aria-label="Trace home">
            <span className="brand__mark" aria-hidden="true">
              <span />
            </span>
            TRACE
          </a>
          <span className="topbar__status">
            <span aria-hidden="true" /> Live geolocation
          </span>
        </nav>

        <div className="hero__content">
          <p className="eyebrow">IP intelligence / global network</p>
          <h1>Find the signal behind any address.</h1>
          <p className="hero__lede">
            Resolve an IP or domain into its approximate network origin,
            timezone, and provider.
          </p>

          <form className="search" onSubmit={handleSubmit} noValidate>
            <label className="sr-only" htmlFor="address-search">
              IP address or domain
            </label>
            <span className="search__prompt" aria-hidden="true">
              &gt;
            </span>
            <input
              id="address-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="8.8.8.8 or example.com"
              autoComplete="off"
              spellCheck="false"
              aria-describedby={error ? "lookup-message" : undefined}
              aria-invalid={loadState === "error"}
            />
            <button type="submit" disabled={isLoading}>
              <span>{isLoading ? "Tracing" : "Trace address"}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 10h11M11 5l5 5-5 5" />
              </svg>
            </button>
          </form>
          <div
            id="lookup-message"
            className={`lookup-message ${error ? "lookup-message--visible" : ""}`}
            role={error ? "alert" : "status"}
            aria-live={error ? "assertive" : "polite"}
          >
            {error || (isLoading ? "Resolving network coordinates..." : "")}
          </div>
        </div>
      </header>

      <main>
        <section className="details" aria-label="Address details">
          <div className="details__heading">
            <div>
              <span className="details__index">01</span>
              <h2>Resolved endpoint</h2>
            </div>
            <span className={`signal ${isLoading ? "signal--loading" : ""}`}>
              {isLoading ? "Acquiring" : result ? "Locked" : "Standby"}
            </span>
          </div>
          <dl className="details__grid" aria-busy={isLoading}>
            {detailLabels.map((label, index) => (
              <div className="detail" key={label}>
                <dt>{label}</dt>
                <dd className={!result ? "detail__placeholder" : ""}>
                  {details[index]}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="map-wrap">
          <div className="map-meta">
            <span aria-hidden="true">02 / Coordinate plot</span>
            <span>
              {result
                ? `${result.location.lat.toFixed(4)} / ${result.location.lng.toFixed(4)}`
                : "Awaiting coordinates"}
            </span>
          </div>
          <MapPanel result={result} />
        </div>
      </main>
    </div>
  );
}
