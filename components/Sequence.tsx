"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { Photo } from "@/lib/types";
export default function Sequence({
  lines,
  photos,
  onDone,
  quietEnd = false,
  reduced = false,
}: {
  lines: string[];
  photos?: Photo[];
  onDone: () => void;
  quietEnd?: boolean;
  reduced?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const el = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const total =
    Math.max(lines.length, photos?.length ?? 0) + (quietEnd ? 1 : 0);
  useEffect(() => {
    if (index >= total) {
      done.current();
      return;
    }
    const tween = gsap.fromTo(
      el.current,
      { opacity: 0, y: reduced ? 0 : 12 },
      { opacity: 1, y: 0, duration: reduced ? 0.1 : 1 },
    );
    if (paused || hidden)
      return () => {
        tween.kill();
      };
    const timeout = setTimeout(
      () => setIndex((i) => i + 1),
      index >= lines.length ? 4200 : Math.max(5200, lines[index].length * 57),
    );
    return () => {
      clearTimeout(timeout);
      tween.kill();
    };
  }, [index, total, lines, paused, hidden, reduced]);
  const p = photos?.[Math.min(index, photos.length - 1)];
  return (
    <section
      className={`sequence ${index >= lines.length ? "quiet" : ""}`}
      aria-label="Memory playback"
    >
      <div ref={el} className="sequence-inner">
        {p && (
          <div className="playback-photo">
            {p.src ? (
              <img src={p.src} alt={p.label} />
            ) : (
              <div className="photo-placeholder">
                <span>{p.year}</span>
                <p>{p.label}</p>
              </div>
            )}
          </div>
        )}
        {index < lines.length && (
          <p className="narrative" aria-live="polite">
            {lines[index]}
          </p>
        )}
      </div>
      {index < lines.length && (
        <div className="sequence-controls">
          <button className="text-button" onClick={() => setPaused(!paused)}>
            {paused ? "RESUME" : "PAUSE"}
          </button>
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(lines.length).padStart(2, "0")}
          </span>
          <button
            className="text-button"
            onClick={() => setIndex((i) => i + 1)}
          >
            CONTINUE <span>→</span>
          </button>
        </div>
      )}
    </section>
  );
}
