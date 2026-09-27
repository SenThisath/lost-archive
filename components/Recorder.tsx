"use client";
import { useEffect, useRef, useState } from "react";
export default function Recorder({
  onKeep,
  onCancel,
}: {
  onKeep: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<
      "permission" | "ready" | "recording" | "review" | "error"
    >("permission"),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0),
    [url, setUrl] = useState("");
  const stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    blob = useRef<Blob | null>(null),
    orb = useRef<HTMLDivElement>(null),
    audioCtx = useRef<AudioContext | null>(null),
    frame = useRef(0),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null),
    started = useRef(0),
    urlRef = useRef(""),
    mounted = useRef(true),
    sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    async function prepare() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
          throw new Error(
            "This browser cannot record audio. You can write instead.",
          );
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setError(
            "Microphone access is unavailable. Writing or keeping it private is just as welcome.",
          );
          setStatus("error");
        }
      }
    }
    void prepare();
    return () => {
      cancelled = true;
      mounted.current = false;
      sourceRef.current?.disconnect();
      if (timeout.current) clearTimeout(timeout.current);
      cancelAnimationFrame(frame.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      audioCtx.current?.close();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (timeout.current) clearTimeout(timeout.current);
    cancelAnimationFrame(frame.current);
  };
  const start = () => {
    if (!stream.current || status !== "ready") return;
    try {
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      const r = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        sourceRef.current?.disconnect();
        if (!mounted.current) return;
        blob.current = new Blob(chunks, { type: r.mimeType });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob.current);
        setUrl(urlRef.current);
        setStatus("review");
      };
      r.onerror = () => {
        setError("That recording could not be saved. Please try again.");
        setStatus("error");
      };
      r.start();
      started.current = Date.now();
      setStatus("recording");
      const ctx = audioCtx.current ?? new AudioContext();
      audioCtx.current = ctx;
      void ctx.resume();
      const source = ctx.createMediaStreamSource(stream.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      sourceRef.current = source;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const meter = () => {
        analyser.getByteFrequencyData(data);
        const level = data.reduce((a, b) => a + b, 0) / data.length / 128;
        orb.current?.style.setProperty(
          "--voice-scale",
          String(1 + level * 0.7),
        );
        setSeconds(Math.floor((Date.now() - started.current) / 1000));
        frame.current = requestAnimationFrame(meter);
      };
      meter();
      timeout.current = setTimeout(stop, 90000);
    } catch {
      setError("Recording is not supported here. Try writing your message.");
      setStatus("error");
    }
  };
  return (
    <div className="recorder">
      <div
        className={`voice-orb ${status === "recording" ? "recording" : ""}`}
        ref={orb}
      />
      <p className="eyebrow">
        {status === "permission"
          ? "WAITING FOR MICROPHONE"
          : status === "recording"
            ? `RECORDING · ${seconds}s / 90s`
            : status === "review"
              ? "YOUR WORDS, SAFELY HERE"
              : "ONLY WHEN YOU’RE READY"}
      </p>
      {(status === "ready" || status === "recording") && (
        <button
          className="primary"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start();
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              start();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              stop();
            }
          }}
          onBlur={stop}
        >
          HOLD TO SPEAK
        </button>
      )}
      {status === "review" && (
        <>
          <audio controls src={url} aria-label="Listen to your recording" />
          <div className="button-row">
            <button
              className="secondary"
              onClick={() => {
                blob.current = null;
                setSeconds(0);
                setStatus("ready");
              }}
            >
              RECORD AGAIN
            </button>
            <button
              className="primary"
              onClick={() => blob.current && onKeep(blob.current)}
            >
              KEEP THIS
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="small-copy">
          {error}
        </p>
      )}
      <p className="privacy-note">
        Kept only in this browser when you choose “Keep this”.
        <br />
        Nothing is uploaded or sent to anyone.
      </p>
      <button className="text-button" onClick={onCancel}>
        GO BACK
      </button>
    </div>
  );
}
