"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <span className="loader-orbit" />
      <p className="eyebrow">CONSTRUCTING ARCHIVE</p>
    </div>
  ),
});
type State = { open: boolean; preview: boolean; unlockAt: number; now: number };
export default function Gate({ initial }: { initial: State }) {
  const [status, setStatus] = useState(initial),
    [remaining, setRemaining] = useState(
      Math.max(0, initial.unlockAt - initial.now),
    );
  useEffect(() => {
    if (status.open) return;
    const origin = performance.now();
    const tick = setInterval(
      () =>
        setRemaining(
          Math.max(
            0,
            status.unlockAt - status.now - (performance.now() - origin),
          ),
        ),
      1000,
    );
    const check = async () => {
      try {
        const r = await fetch("/api/gate", { cache: "no-store" });
        if (r.ok) setStatus(await r.json());
      } catch {
        /* Keep the archive sealed while offline. */
      }
    };
    const poll = setInterval(check, 15000);
    const focus = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", focus);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [status]);
  if (status.open) return <Experience preview={status.preview} />;
  const seconds = Math.floor(remaining / 1000),
    parts = [
      Math.floor(seconds / 86400),
      Math.floor(seconds / 3600) % 24,
      Math.floor(seconds / 60) % 60,
      seconds % 60,
    ];
  return (
    <main className="sealed">
      <div className="sealed-grid" />
      <header className="brand">
        <span className="brand-mark">⌑</span> PROJECT <strong>19</strong>
      </header>
      <div className="sealed-main">
        <p className="eyebrow muted">RESTRICTED ACCESS / TEMPORAL LOCK</p>
        <div className="seal-symbol">
          <span />
          <span />
          <i />
        </div>
        <p className="eyebrow gold">THIS CHAPTER IS NOT READY YET</p>
        <h1>
          Some stories
          <br />
          wait for <em>their moment.</em>
        </h1>
        <p className="sealed-copy">
          The archive is sealed.
          <br />
          Come back when the next chapter begins.
        </p>
        <div className="countdown" aria-label="Time until archive opens">
          {parts.map((p, i) => (
            <div key={i}>
              <b>{String(p).padStart(2, "0")}</b>
              <span>{["DAYS", "HOURS", "MINUTES", "SECONDS"][i]}</span>
            </div>
          ))}
        </div>
        <div className="release-date">
          <span className="tiny-lock">◇</span> 01 OCTOBER 2026 <i /> 00:00 ·
          ASIA / COLOMBO
        </div>
      </div>
      <footer className="sealed-footer">
        <span>THE LOST ARCHIVE</span>
        <span>NOT EVERYTHING LOST IS GONE.</span>
        <span>ACCESS SEALED</span>
      </footer>
    </main>
  );
}
