"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import type {
  Photo,
  ResponseKind,
  SceneName,
  Story,
  WorldState,
} from "@/lib/types";
import { memoryNames } from "@/lib/types";
import { ArchiveSound } from "@/lib/sound";
import {
  deleteKeepsake,
  readKeepsake,
  saveKeepsake,
  type Keepsake,
} from "@/lib/local-vault";
import Sequence from "./Sequence";
import Recorder from "./Recorder";
const World = dynamic(() => import("./World"), { ssr: false });
type Screen =
  | "boot"
  | "intro"
  | "hub"
  | "memory"
  | "sequence"
  | "restored"
  | "anomaly"
  | "break"
  | "final"
  | "birthday"
  | "letter"
  | "stay";
const scenes: SceneName[] = [
  "childhood",
  "date",
  "darkroom",
  "mirror",
  "transmission",
];
const STORAGE = "lost-archive-19-progress";
const bootLines = [
  "ARCHIVE INITIALIZING…",
  "SUBJECT IDENTIFIED.",
  "MEMORY INTEGRITY: 14%",
  "5 FRAGMENTS MISSING.",
  "1 FINAL CHAPTER LOCKED.",
];
export default function Experience({ preview }: { preview: boolean }) {
  const [story, setStory] = useState<Story | null>(null),
    [loadError, setLoadError] = useState(""),
    [screen, setScreen] = useState<Screen>("boot"),
    [bootStep, setBootStep] = useState(0),
    [ready, setReady] = useState(false),
    [completed, setCompleted] = useState(0),
    [active, setActive] = useState(0),
    [scene, setScene] = useState<SceneName>("hub"),
    [selected, setSelected] = useState<number[]>([]),
    [projector, setProjector] = useState(false),
    [hint, setHint] = useState(""),
    [lit, setLit] = useState(false),
    [muted, setMuted] = useState(false),
    [reduced, setReduced] = useState(false),
    [response, setResponse] = useState<ResponseKind | null>(null),
    [responseMode, setResponseMode] = useState<
      "initial" | "choices" | "write" | "say" | "voice" | "sealed"
    >("initial"),
    [letter, setLetter] = useState(""),
    [storageError, setStorageError] = useState(""),
    [video, setVideo] = useState<HTMLVideoElement | null>(null),
    [cameraError, setCameraError] = useState(""),
    [cameraPending, setCameraPending] = useState(false),
    [reflectionSkipped, setReflectionSkipped] = useState(false),
    [voicePlaying, setVoicePlaying] = useState(false),
    [voiceError, setVoiceError] = useState(false),
    [showExplore, setShowExplore] = useState(false),
    [keepsake, setKeepsake] = useState<Keepsake | null>(null),
    [keepsakeUrl, setKeepsakeUrl] = useState(""),
    [showHelp, setShowHelp] = useState(false),
    [syncMode, setSyncMode] = useState("local");
  const [sequence, setSequence] = useState<{
    lines: string[];
    photos?: Photo[];
    quiet?: boolean;
  } | null>(null);
  const sequenceDone = useRef<() => void>(() => {}),
    sound = useRef<ArchiveSound | null>(null),
    stream = useRef<MediaStream | null>(null),
    cameraRequested = useRef(false),
    alive = useRef(true),
    overlay = useRef<HTMLDivElement>(null),
    voice = useRef<HTMLAudioElement | null>(null),
    syncQueue = useRef(Promise.resolve()),
    completedRef = useRef(0),
    cameraGeneration = useRef(0);
  completedRef.current = completed;
  useEffect(() => {
    alive.current = true;
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    sound.current = new ArchiveSound();
    async function load() {
      try {
        const r = await fetch("/api/story", { cache: "no-store" });
        if (r.status === 423) {
          location.reload();
          return;
        }
        if (!r.ok) throw new Error();
        setStory(await r.json());
        let local = { completed: 0, candleLit: false };
        try {
          const raw = JSON.parse(localStorage.getItem(STORAGE) || "{}");
          local = {
            completed: Number.isInteger(raw.completed)
              ? Math.max(0, Math.min(5, raw.completed))
              : 0,
            candleLit: raw.candleLit === true && raw.completed === 5,
          };
        } catch {}
        let progress = local;
        try {
          const r = await fetch("/api/progress");
          const remote = await r.json();
          setSyncMode(remote.mode || "offline");
          if (remote.mode === "cloud") {
            progress = {
              completed: Math.max(local.completed, remote.completed),
              candleLit: local.candleLit || remote.candleLit,
            };
            for (let n = remote.completed + 1; n <= progress.completed; n++)
              await fetch("/api/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: n, candleLit: false }),
              });
            if (progress.candleLit && !remote.candleLit)
              await fetch("/api/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: 5, candleLit: true }),
              });
          }
        } catch {
          setSyncMode("offline");
        }
        if (alive.current) {
          setCompleted(progress.completed);
          setLit(progress.candleLit);
          try {
            const k = await readKeepsake();
            if (k) setResponse(k.kind);
          } catch {}
        }
      } catch {
        setLoadError("The archive couldn’t be reached. Please try again.");
      }
    }
    void load();
    return () => {
      alive.current = false;
      cameraGeneration.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      sound.current?.dispose();
      voice.current?.pause();
    };
  }, []);
  useEffect(() => {
    if (screen !== "boot") return;
    const timer = setInterval(
      () => setBootStep((s) => Math.min(bootLines.length, s + 1)),
      900,
    );
    return () => clearInterval(timer);
  }, [screen]);
  useEffect(() => {
    const tween = gsap.fromTo(
      overlay.current,
      { opacity: 0, y: reduced ? 0 : 10 },
      { opacity: 1, y: 0, duration: reduced ? 0.15 : 0.8, ease: "power2.out" },
    );
    return () => {
      tween.kill();
    };
  }, [screen, active, reduced]);
  useEffect(() => {
    if (screen !== "stay") return;
    const t = setTimeout(() => setShowExplore(true), 6000);
    return () => clearTimeout(t);
  }, [screen]);
  useEffect(() => {
    if (screen !== "break") return;
    const t = setTimeout(
      () => {
        setScene("final");
        setScreen("final");
        sound.current?.mute(muted);
        if (cameraRequested.current) void startCamera();
      },
      reduced ? 800 : 3600,
    );
    return () => clearTimeout(t);
  }, [screen]); // transitions intentionally run once
  useEffect(() => {
    if (keepsake?.kind !== "voice") return;
    const url = URL.createObjectURL(keepsake.audio);
    setKeepsakeUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setKeepsakeUrl("");
    };
  }, [keepsake]);
  useEffect(() => {
    if (!showHelp && !keepsake && screen !== "letter") return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(
      ".modal-shade section, .final-letter",
    );
    if (!panel) return;
    const selector =
      "button:not([disabled]), textarea, audio[controls], a[href]";
    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(selector));
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showHelp) setShowHelp(false);
        else if (keepsake) setKeepsake(null);
        else {
          setShowExplore(false);
          setScreen("stay");
        }
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [showHelp, keepsake, screen]);
  const persist = useCallback((count: number, candle: boolean) => {
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify({ completed: count, candleLit: candle }),
      );
    } catch {
      setHint("Progress can’t be saved on this browser. Keep this tab open.");
    }
    syncQueue.current = syncQueue.current.then(async () => {
      try {
        const r = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: count, candleLit: candle }),
        });
        if (!r.ok) setSyncMode("offline");
        else setSyncMode((await r.json()).mode);
      } catch {
        setSyncMode("offline");
      }
    });
  }, []);
  function runSequence(
    lines: string[],
    done: () => void,
    photos?: Photo[],
    quiet = false,
  ) {
    setSequence({ lines, photos, quiet });
    sequenceDone.current = done;
    setScreen("sequence");
  }
  function stopCamera() {
    cameraGeneration.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setVideo(null);
  }
  async function startCamera() {
    if (stream.current) {
      return;
    }
    const generation = ++cameraGeneration.current;
    setCameraPending(true);
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error();
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      if (!alive.current || generation !== cameraGeneration.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.srcObject = s;
      await el.play();
      setVideo(el);
      cameraRequested.current = true;
    } catch {
      setCameraError(
        "The mirror can stay private. You can still continue without a camera.",
      );
    } finally {
      setCameraPending(false);
    }
  }
  function restore() {
    const next = Math.max(completedRef.current, active + 1);
    setCompleted(next);
    persist(next, lit);
    sound.current?.chime();
    setScreen("restored");
    if (active === 3) stopCamera();
  }
  function enterMemory(i: number) {
    if (i > completed) return;
    stopCamera();
    setActive(i);
    setScene(scenes[i]);
    setSelected([]);
    setProjector(false);
    setHint("");
    setReflectionSkipped(false);
    setCameraError("");
    setResponseMode("initial");
    setScreen("memory");
  }
  function home() {
    stopCamera();
    setScene("hub");
    setScreen("hub");
    setHint("");
  }
  function pickPhoto(n: number) {
    if (!story || !projector || selected.includes(n)) return;
    if (n !== selected.length) {
      setHint("Almost. Find the earliest unplaced memory first.");
      return;
    }
    const next = [...selected, n];
    setSelected(next);
    setHint("");
    sound.current?.chime();
    if (next.length === story.childhood.length)
      runSequence(
        [
          "Before I ever knew you, there was already an entire story being written.",
          "I wish I could have met every version of you.",
        ],
        restore,
        story.childhood,
        true,
      );
  }
  function clue(n: number) {
    if (!story || selected.includes(n)) return;
    setSelected([...selected, n]);
    setHint(story.dateClues[n].text);
    sound.current?.chime();
  }
  function develop(n: number) {
    if (!story || selected.includes(n)) return;
    const next = [...selected, n];
    setSelected(next);
    setHint(story.dayObjects[n].detail);
    sound.current?.chime();
    if (next.length === 4)
      runSequence(
        [
          "You probably remember this day because of what happened.",
          "I remember it because I got to experience it with you.",
        ],
        restore,
        story.sharedPhotos,
        true,
      );
  }
  function quality(n: number) {
    if (!story || selected.includes(n) || (!video && !reflectionSkipped))
      return;
    const next = [...selected, n];
    setSelected(next);
    sound.current?.chime();
    if (next.length === story.qualities.length)
      runSequence(
        [
          "You’ve probably looked into thousands of mirrors.",
          "I wish you could see what I see.",
        ],
        restore,
        undefined,
        true,
      );
  }
  function transmission() {
    if (!story || responseMode !== "initial") return;
    runSequence(
      [
        "Some things are remembered.",
        "Some things are felt.",
        "And some things never get said properly.",
        ...story.feelings,
      ],
      () => {
        setResponseMode("choices");
        setScreen("memory");
      },
    );
  }
  async function seal(value: Keepsake) {
    setStorageError("");
    if (value.kind === "private") {
      setResponse("private");
      setResponseMode("sealed");
      try {
        await deleteKeepsake();
      } catch {}
      runSequence(["Some things don’t need words."], () => {
        setResponseMode("voice");
        setScreen("memory");
      });
      return;
    }
    try {
      await saveKeepsake(value);
      setResponse(value.kind);
      setResponseMode("sealed");
      runSequence(["Okay.", "This one belongs to us."], () => {
        setResponseMode("voice");
        setScreen("memory");
      });
    } catch {
      setStorageError(
        "This browser couldn’t save it. You can try again, or keep it to yourself. Nothing was sent.",
      );
    }
  }
  function playVoice() {
    if (!story) return;
    if (!story.voiceMessage || voiceError) {
      runSequence(story.voiceTranscript, restore);
      return;
    }
    if (voicePlaying) return;
    const audio = new Audio(story.voiceMessage);
    voice.current = audio;
    setVoicePlaying(true);
    sound.current?.mute(true);
    audio.onended = () => {
      setVoicePlaying(false);
      sound.current?.mute(muted);
      restore();
    };
    audio.onerror = () => {
      setVoicePlaying(false);
      setVoiceError(true);
      sound.current?.mute(muted);
    };
    audio.play().catch(() => {
      setVoicePlaying(false);
      setVoiceError(true);
      sound.current?.mute(muted);
    });
  }
  function openChapter() {
    setScreen("break");
    sound.current?.mute(true);
  }
  function candle() {
    if (lit || !story) return;
    setLit(true);
    persist(5, true);
    sound.current?.celebrate(story.birthdayTrack);
    setScreen("birthday");
  }
  async function openKeepsake() {
    try {
      const k = await readKeepsake();
      setKeepsake(k ?? { kind: "private" });
    } catch {
      setKeepsake({ kind: "private" });
    }
  }
  function selectWorld(id: string) {
    if (screen === "hub") {
      if (id.startsWith("memory-")) enterMemory(Number(id.split("-")[1]));
      else if (id === "anomaly") setScreen("anomaly");
      return;
    }
    if (screen === "final" && id === "candle") {
      candle();
      return;
    }
    if (screen === "stay" && id === "keepsake") {
      void openKeepsake();
      return;
    }
    if (screen !== "memory") return;
    const n = Number(id.split("-")[1]);
    if (id === "projector") setProjector(true);
    else if (id.startsWith("photo-")) pickPhoto(n);
    else if (id.startsWith("clue-")) clue(n);
    else if (id.startsWith("object-")) develop(n);
    else if (id.startsWith("quality-")) quality(n);
    else if (id === "transmit") transmission();
  }
  if (loadError)
    return (
      <div className="loading-screen">
        <p>{loadError}</p>
        <button className="primary" onClick={() => location.reload()}>
          RECONNECT
        </button>
      </div>
    );
  const progress = selected.length;
  const state: WorldState = {
    scene,
    completed,
    progress,
    projector,
    lit,
    selected,
    video,
    response,
    reducedMotion: reduced,
  };
  const reflectionMoment = screen === "sequence" && scene === "mirror";
  const isWorld = screen !== "boot" && screen !== "intro" && screen !== "break";
  return (
    <main
      className={`experience screen-${screen} ${scene === "final" ? "warm-world" : ""}`}
    >
      {story && isWorld && (
        <World
          state={state}
          story={story}
          onSelect={selectWorld}
          onReady={() => setReady(true)}
        />
      )}
      <div className="vignette" />
      {preview && (
        <div className="preview-badge">
          DEVELOPMENT PREVIEW · RELEASE LOCK BYPASSED LOCALLY
        </div>
      )}
      {screen === "boot" && (
        <section className="boot">
          <div className="boot-heading">
            PROJECT <b>19</b>
            <span>THE LOST ARCHIVE</span>
          </div>
          <div className="boot-lines">
            {bootLines.slice(0, bootStep).map((t, i) => (
              <p key={t} className={i === 2 ? "gold" : ""}>
                {t}
              </p>
            ))}
          </div>
          {bootStep === 5 && story && (
            <button
              className="primary"
              onClick={() => {
                setScreen("intro");
                void sound.current
                  ?.start(story.ambientTrack)
                  .catch(() => setMuted(true));
              }}
            >
              ENTER ARCHIVE <span>↗</span>
            </button>
          )}
          <div className="boot-foot">
            SOUND RECOMMENDED <span>·</span> TAKE YOUR TIME
          </div>
        </section>
      )}
      {screen === "intro" && (
        <section className="intro">
          <p className="eyebrow">ARCHIVE 019 / UNKNOWN ORIGIN</p>
          <h1>
            Some things
            <br />
            are too important
            <br />
            to <em>forget.</em>
          </h1>
          <p>Five fragments. One unfinished story.</p>
          <button
            className="primary"
            onClick={() => {
              if (lit) {
                setScene("final");
                setScreen("stay");
              } else {
                setScene("hub");
                setScreen("hub");
              }
            }}
          >
            {completed ? "RETURN TO YOUR ARCHIVE" : "FIND THE FIRST FRAGMENT"}{" "}
            <span>→</span>
          </button>
        </section>
      )}
      {isWorld && !reflectionMoment && (
        <>
          <header className="hud">
            <button
              className="brand text-button"
              onClick={() => {
                if (
                  screen === "hub" ||
                  screen === "memory" ||
                  screen === "stay"
                )
                  home();
              }}
              aria-label="Return to archive"
            >
              PROJECT <strong>19</strong>
              <i /> <span>THE LOST ARCHIVE</span>
            </button>
            <div className="hud-actions">
              {video && (
                <button
                  className="text-button camera-live"
                  onClick={() => {
                    cameraRequested.current = false;
                    stopCamera();
                  }}
                >
                  CAMERA ON · TURN OFF
                </button>
              )}
              <button
                className="icon-button"
                onClick={() => {
                  setMuted(!muted);
                  sound.current?.mute(!muted);
                }}
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                title={muted ? "Sound off" : "Sound on"}
              >
                {muted ? "♪̸" : "♪"}
              </button>
              <button
                className="icon-button"
                onClick={() => setShowHelp(!showHelp)}
                aria-label="Controls and privacy"
              >
                ?
              </button>
            </div>
          </header>
          <div className="side-code">ARCHIVE / 019 / {scene.toUpperCase()}</div>
          <footer className="world-footer">
            <span>
              <i className="status-light" />{" "}
              {screen === "stay"
                ? "STORY STILL BEING WRITTEN"
                : `${completed} / 5 FRAGMENTS RESTORED`}
            </span>
            <span className="desktop-hint">
              DRAG TO LOOK · WASD TO MOVE · CLICK TO DISCOVER
            </span>
            <span>
              INTEGRITY <b>{completed === 5 ? 100 : 14 + completed * 17}%</b>
            </span>
          </footer>
        </>
      )}
      <div ref={overlay} className="interface">
        {screen === "hub" && (
          <>
            <div className="hub-title">
              <p className="eyebrow">RECOVER THE MISSING FRAGMENTS</p>
              <h1>
                The Lost <em>Archive</em>
              </h1>
              <p>Not everything lost is gone.</p>
            </div>
            <div className="memory-nav">
              {memoryNames.map((name, i) => (
                <button
                  key={name}
                  className={`memory-door ${i === completed ? "available" : ""} ${i < completed ? "restored" : ""}`}
                  disabled={i > completed}
                  onClick={() => enterMemory(i)}
                >
                  <span className="door-number">
                    0{i + 1}
                    <span>
                      {i < completed ? "✓" : i > completed ? "◇" : "↗"}
                    </span>
                  </span>
                  <span className="door-title">{name}</span>
                  <span className="door-status">
                    {i < completed
                      ? "RESTORED · REVISIT"
                      : i === completed
                        ? "BEGIN RECOVERY"
                        : "FRAGMENT SEALED"}
                  </span>
                </button>
              ))}
            </div>
            {completed === 5 && (
              <button
                className="anomaly-button"
                onClick={() => {
                  if (lit) {
                    setScene("final");
                    setScreen("stay");
                  } else setScreen("anomaly");
                }}
              >
                {lit ? "RETURN TO YOUR NEXT CHAPTER" : "ANOMALY DETECTED"}{" "}
                <span>→</span>
              </button>
            )}
          </>
        )}
        {screen === "memory" && story && (
          <>
            <div className="memory-heading">
              <button className="text-button back" onClick={home}>
                ← ARCHIVE
              </button>
              <p className="eyebrow gold">MEMORY 0{active + 1}</p>
              <h1>{memoryNames[active]}</h1>
            </div>
            {active === 0 && (
              <div className="interaction-panel wide">
                <p className="eyebrow">
                  {projector
                    ? `${progress} / 4 — YOUNGEST TO NOW`
                    : "A STORY BEFORE OURS"}
                </p>
                {!projector ? (
                  <>
                    <p className="small-copy">
                      An old projector. Four missing moments.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setProjector(true)}
                    >
                      ACTIVATE PROJECTOR <span>↗</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="small-copy">
                      Select the photographs in the order she grew.
                    </p>
                    <div className="photo-picks">
                      {[2, 0, 3, 1].map((n) => (
                        <button
                          key={n}
                          disabled={selected.includes(n)}
                          className={`photo-pick ${selected.includes(n) ? "found" : ""}`}
                          onClick={() => pickPhoto(n)}
                        >
                          {story.childhood[n].src ? (
                            <img
                              src={story.childhood[n].src}
                              alt={story.childhood[n].label}
                            />
                          ) : (
                            <span className="mini-photo">
                              {story.childhood[n].year}
                            </span>
                          )}
                          <span>{story.childhood[n].label}</span>
                          <b>{selected.includes(n) ? "✓" : "+"}</b>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {hint && (
                  <p className="hint" role="status">
                    {hint}
                  </p>
                )}
              </div>
            )}
            {active === 1 && (
              <div className="interaction-panel">
                <p className="date-display">
                  {progress === 3
                    ? story.relationshipDisplay
                    : story.dateClues
                        .map((c, i) => (selected.includes(i) ? c.piece : "??"))
                        .join(" / ")}
                </p>
                {progress < 3 ? (
                  <>
                    <p className="small-copy">
                      Three traces of a day that changed everything.
                    </p>
                    <div className="clue-buttons">
                      {story.dateClues.map((c, i) => (
                        <button
                          className={selected.includes(i) ? "selected" : ""}
                          key={c.title}
                          onClick={() => clue(i)}
                          disabled={selected.includes(i)}
                        >
                          <span>0{i + 1}</span>
                          {c.title}
                          <b>{selected.includes(i) ? "✓" : "+"}</b>
                        </button>
                      ))}
                    </div>
                    {hint && <p className="hint">{hint}</p>}
                  </>
                ) : (
                  <>
                    <p className="eyebrow gold">
                      UNUSUALLY HIGH MEMORY SIGNIFICANCE
                    </p>
                    <p className="question">Do you remember what happened?</p>
                    <div className="button-row">
                      {["OF COURSE.", "HOW COULD I FORGET?"].map((t) => (
                        <button
                          className="secondary"
                          key={t}
                          onClick={() =>
                            runSequence(
                              [
                                "There are thousands of days in a lifetime.",
                                "Somehow, this one became one of mine.",
                                "Because this was the day there became an us.",
                              ],
                              restore,
                            )
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {active === 2 && (
              <div className="interaction-panel">
                <p className="eyebrow">DEVELOPING MEMORY · {progress * 25}%</p>
                <p className="small-copy">
                  Find the details. Let the moment come back.
                </p>
                <div className="clue-buttons">
                  {story.dayObjects.map((o, i) => (
                    <button
                      key={i}
                      disabled={selected.includes(i)}
                      onClick={() => develop(i)}
                      className={selected.includes(i) ? "selected" : ""}
                    >
                      <span>0{i + 1}</span>
                      {o.title}
                      <b>{selected.includes(i) ? "✓" : "+"}</b>
                    </button>
                  ))}
                </div>
                {hint && <p className="hint">{hint}</p>}
              </div>
            )}
            {active === 3 && (
              <>
                {video && (
                  <div
                    className="mirror-preview"
                    style={{
                      filter: `blur(${(5 - progress) * 1.5}px)`,
                      opacity: 0.35 + progress * 0.13,
                    }}
                  >
                    <LiveVideo video={video} />
                  </div>
                )}
                <div className="interaction-panel mirror-panel">
                  {!video && !reflectionSkipped ? (
                    <>
                      <p className="eyebrow">REFLECTION DATA MISSING</p>
                      <button
                        className="primary"
                        disabled={cameraPending}
                        onClick={() => void startCamera()}
                      >
                        {cameraPending
                          ? "OPENING MIRROR…"
                          : "RESTORE REFLECTION"}
                      </button>
                      <p className="privacy-note">
                        A live mirror. No photos. No recording. No uploads.
                      </p>
                      {cameraError && <p className="hint">{cameraError}</p>}
                      <button
                        className="text-button"
                        onClick={() => {
                          stopCamera();
                          setReflectionSkipped(true);
                        }}
                      >
                        CONTINUE WITHOUT CAMERA
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">{progress} / 5 · HOW I SEE YOU</p>
                      <div className="qualities">
                        {story.qualities.map((q, i) => (
                          <button
                            key={q}
                            className={selected.includes(i) ? "selected" : ""}
                            onClick={() => quality(i)}
                            disabled={selected.includes(i)}
                          >
                            {q}
                            <span>{selected.includes(i) ? "✓" : "+"}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {active === 4 && (
              <div
                className={`interaction-panel transmission-panel ${responseMode === "write" ? "letter-panel" : ""}`}
              >
                {responseMode === "initial" && (
                  <>
                    <p className="eyebrow">AN UNSENT TRANSMISSION</p>
                    <p className="small-copy">
                      There are things I haven’t said properly.
                    </p>
                    <button className="primary" onClick={transmission}>
                      LISTEN CLOSELY <span>↗</span>
                    </button>
                  </>
                )}
                {responseMode === "choices" && (
                  <>
                    <p className="eyebrow gold">TRANSMISSION COMPLETE</p>
                    <p className="question">
                      But an archive shouldn’t contain
                      <br />
                      only one side of a story.
                    </p>
                    <h2>Tell me what you feel.</h2>
                    <div className="response-choices">
                      <button
                        className="secondary"
                        onClick={() => setResponseMode("write")}
                      >
                        WRITE IT <span>↗</span>
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setResponseMode("say")}
                      >
                        SAY IT <span>♪</span>
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void seal({ kind: "private" })}
                      >
                        KEEP IT TO MYSELF ♡
                      </button>
                    </div>
                  </>
                )}
                {responseMode === "write" && (
                  <>
                    <p className="eyebrow">FROM YOU / TO THIS MOMENT</p>
                    <h2>No one is grading this.</h2>
                    <p className="small-copy">
                      Just say whatever is in your head.
                    </p>
                    <label className="sr-only" htmlFor="her-letter">
                      Your private letter
                    </label>
                    <textarea
                      id="her-letter"
                      value={letter}
                      onChange={(e) => setLetter(e.target.value)}
                      maxLength={10000}
                      placeholder="Dear you…"
                    />
                    <p className="privacy-note">
                      This letter stays in this browser. It is not sent to him.
                      <br />
                      You can read or delete it in the final world.
                    </p>
                    <div className="button-row">
                      <button
                        className="text-button"
                        onClick={() => setResponseMode("choices")}
                      >
                        GO BACK
                      </button>
                      <button
                        className="primary"
                        disabled={!letter.trim()}
                        onClick={() =>
                          void seal({ kind: "letter", text: letter.trim() })
                        }
                      >
                        SEAL MESSAGE <span>↗</span>
                      </button>
                    </div>
                  </>
                )}
                {responseMode === "say" && (
                  <Recorder
                    onKeep={(audio) => void seal({ kind: "voice", audio })}
                    onCancel={() => setResponseMode("choices")}
                  />
                )}{" "}
                {responseMode === "voice" && (
                  <>
                    <p className="eyebrow">ONE MORE TRANSMISSION</p>
                    <p className="question">Before we open the last door.</p>
                    <button
                      className="primary"
                      onClick={playVoice}
                      disabled={voicePlaying}
                    >
                      {voicePlaying
                        ? "PLAYING…"
                        : story.voiceMessage && !voiceError
                          ? "PLAY MY VOICE MESSAGE"
                          : "OPEN MY MESSAGE"}{" "}
                      <span>▷</span>
                    </button>
                    {voicePlaying && (
                      <button
                        className="text-button"
                        onClick={() => {
                          voice.current?.pause();
                          setVoicePlaying(false);
                          sound.current?.mute(muted);
                          runSequence(story.voiceTranscript, restore);
                        }}
                      >
                        READ INSTEAD
                      </button>
                    )}
                    {voiceError && (
                      <p className="hint">
                        The audio couldn’t play. The words are still here.
                      </p>
                    )}
                  </>
                )}
                {storageError && (
                  <p role="alert" className="hint">
                    {storageError}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {screen === "sequence" && sequence && (
          <>
            {scene === "mirror" && video && (
              <div className="mirror-full">
                <LiveVideo video={video} />
              </div>
            )}
            <Sequence
              key={sequence.lines.join("|")}
              lines={sequence.lines}
              photos={sequence.photos}
              quietEnd={sequence.quiet}
              reduced={reduced}
              onDone={() => sequenceDone.current()}
            />
          </>
        )}
        {screen === "restored" && (
          <section className="restoration">
            <div className="restored-symbol">◇</div>
            <p className="eyebrow gold">MEMORY 0{active + 1} RESTORED</p>
            <h1>
              {active === 4
                ? "Ours."
                : active === 3
                  ? "How I see you."
                  : "A little less lost."}
            </h1>
            <p>
              {active === 4
                ? "5 / 5 memory fragments recovered. Archive integrity: 100%."
                : "The archive remembers a little more."}
            </p>
            <button
              className="primary"
              onClick={() => {
                if (active === 4) {
                  setScene("hub");
                  setScreen("anomaly");
                } else home();
              }}
            >
              {active === 4 ? "RETURN TO ARCHIVE" : "CONTINUE"} <span>→</span>
            </button>
          </section>
        )}
        {screen === "anomaly" && <Anomaly onOpen={openChapter} />}
        {screen === "break" && (
          <div className="archive-break">
            <div className="break-line" />
            <p>THIS STORY WAS NEVER FINISHED.</p>
            <span className="new-light" />
          </div>
        )}
        {screen === "final" && (
          <>
            <div className="final-heading">
              <p className="eyebrow gold">EVERYTHING THAT BROUGHT YOU HERE</p>
              <h1>
                One more <em>little light.</em>
              </h1>
              <p>
                Every memory. Every version of you.
                <br />
                All here, for this moment.
              </p>
            </div>
            <div className="candle-cta">
              <button className="primary" onClick={candle}>
                LIGHT THE CANDLE <span>✧</span>
              </button>
              <p className="privacy-note">
                Make a wish. You don’t have to tell me.
              </p>
            </div>
          </>
        )}
        {screen === "birthday" && story && (
          <Birthday
            name={story.name}
            age={story.age}
            onLetter={() => setScreen("letter")}
            reduced={reduced}
          />
        )}
        {screen === "letter" && story && (
          <section
            className="final-letter"
            role="dialog"
            aria-modal="true"
            aria-label="Your birthday letter"
          >
            <div className="letter-scroll">
              <p className="eyebrow">
                FROM: ME <span>TO: YOU</span>
              </p>
              <h1>My love,</h1>
              {story.finalLetter.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <div className="letter-signature">Always, me. ♡</div>
              <button
                className="secondary"
                onClick={() => {
                  setShowExplore(false);
                  setScreen("stay");
                }}
              >
                STAY HERE FOR A WHILE
              </button>
            </div>
          </section>
        )}
        {screen === "stay" && (
          <>
            <div className="stay-heading">
              <p className="eyebrow gold">THERE’S NO NEED TO GO ANYWHERE</p>
              <h1>
                Stay here
                <br />
                <em>for a while.</em>
              </h1>
            </div>
            <div className="stay-actions">
              <button
                className="text-button"
                onClick={() => setScreen("letter")}
              >
                READ MY LETTER
              </button>
              <button
                className="text-button"
                onClick={() => void openKeepsake()}
              >
                YOUR KEEPSAKE
              </button>
              {!video && (
                <button
                  className="text-button"
                  onClick={() => void startCamera()}
                >
                  RESTORE MIRROR
                </button>
              )}
              {showExplore && (
                <button className="secondary" onClick={home}>
                  EXPLORE THE ARCHIVE <span>→</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {showHelp && (
        <div className="modal-shade">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Controls and privacy"
          >
            <button
              className="close"
              onClick={() => setShowHelp(false)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow gold">MAKE YOURSELF AT HOME</p>
            <h2>Take your time.</h2>
            <p>
              Drag to look around. Use WASD or arrow keys to move. Touch a
              glowing object, or use the labelled controls. Every action works
              on a phone too.
            </p>
            <button className="secondary" onClick={() => setReduced(!reduced)}>
              {reduced ? "ENABLE GENTLE MOTION" : "REDUCE MOTION"}
            </button>
            <p>
              The camera is a live mirror only. Your written or recorded
              response stays in this browser and is never uploaded. Clearing
              browser data deletes it.
            </p>
            <p className="privacy-note">
              {syncMode === "cloud"
                ? "Chapter progress is saved securely. Personal responses stay on this device."
                : syncMode === "offline"
                  ? "Cloud sync is unavailable. Progress is kept in this browser."
                  : "Chapter progress is kept in this browser."}
            </p>
          </section>
        </div>
      )}
      {keepsake && (
        <div className="modal-shade">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Your keepsake"
          >
            <button
              className="close"
              onClick={() => setKeepsake(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow gold">THIS ONE BELONGS TO US</p>
            {keepsake.kind === "letter" ? (
              <p className="keepsake-letter">{keepsake.text}</p>
            ) : keepsake.kind === "voice" ? (
              <audio controls src={keepsakeUrl} />
            ) : (
              <h2>Some things don’t need words.</h2>
            )}
            {keepsake.kind !== "private" && (
              <>
                <p className="privacy-note">Saved only in this browser.</p>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await deleteKeepsake();
                      setKeepsake({ kind: "private" });
                      setResponse("private");
                    } catch {
                      setStorageError(
                        "Could not delete the keepsake. Try again.",
                      );
                    }
                  }}
                >
                  DELETE THIS KEEPSAKE
                </button>
                {storageError && <p role="alert">{storageError}</p>}
              </>
            )}
          </section>
        </div>
      )}
      {story && isWorld && !ready && (
        <div className="world-loading">
          <span className="loader-orbit" />
          <p className="eyebrow">RESTORING SPACE…</p>
        </div>
      )}
    </main>
  );
}
function LiveVideo({ video }: { video: HTMLVideoElement }) {
  const el = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (el.current) {
      el.current.srcObject = video.srcObject;
      void el.current.play().catch(() => {});
    }
    return () => {
      if (el.current) el.current.srcObject = null;
    };
  }, [video]);
  return (
    <video
      ref={el}
      autoPlay
      playsInline
      muted
      aria-label="Your live reflection, never recorded"
    />
  );
}
function Anomaly({ onOpen }: { onOpen: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep(1), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="anomaly">
      <p className="eyebrow">5 / 5 FRAGMENTS RECOVERED · INTEGRITY 100%</p>
      {step === 0 ? (
        <p className="ellipsis">…</p>
      ) : (
        <>
          <p className="eyebrow anomaly-label">ANOMALY DETECTED</p>
          <h1>
            One file doesn’t
            <br />
            belong <em>here.</em>
          </h1>
          <div className="anomaly-file">
            <span>⌑</span>
            <div>
              <b>CHAPTER_19</b>
              <p>NOT YET WRITTEN</p>
            </div>
            <span>↗</span>
          </div>
          <button className="primary" onClick={onOpen}>
            OPEN? <span>→</span>
          </button>
        </>
      )}
    </section>
  );
}
function Birthday({
  name,
  age,
  onLetter,
  reduced,
}: {
  name: string;
  age: number;
  onLetter: () => void;
  reduced: boolean;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, 3)),
      reduced ? 1400 : 2800,
    );
    return () => clearInterval(timer);
  }, [reduced]);
  return (
    <section className="birthday">
      <div className="birthday-particles">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${i * 0.13}s`,
              animationDuration: `${5 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      {stage === 0 ? (
        <>
          <p className="eyebrow gold">{age - 1} CHAPTERS COMPLETE</p>
          <h1>
            A new story
            <br />
            is <em>beginning.</em>
          </h1>
        </>
      ) : stage < 3 ? (
        <>
          <p className="eyebrow gold">CHAPTER {age}</p>
          <h1>{stage === 1 ? "Unwritten." : "Unlocked."}</h1>
        </>
      ) : (
        <>
          <p className="eyebrow gold">CHAPTER {age} · UNLOCKED</p>
          <h1>
            Happy birthday,
            <br />
            <em>{name}.</em>
          </h1>
          <p className="birthday-heart">♡</p>
          <button className="envelope-button" onClick={onLetter}>
            <span>✉</span>
            <div>
              ONE LAST LETTER<small>FROM ME, TO YOU</small>
            </div>
            <b>→</b>
          </button>
        </>
      )}
    </section>
  );
}
