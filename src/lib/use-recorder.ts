import { useCallback, useEffect, useRef, useState } from "react";
import {
  QUALITY_PRESETS,
  type QualityKey,
  type Recording,
  type RecorderSettings,
} from "./recorder-types";

type Status = "idle" | "recording" | "paused";

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useRecorder(settings: RecorderSettings) {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const qualityRef = useRef<QualityKey>(settings.quality);

  const cleanup = useCallback(() => {
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setStream(null);
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (status !== "recording") return;
    const id = window.setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 200);
    return () => window.clearInterval(id);
  }, [status]);

  const start = useCallback(async () => {
    setError(null);
    const preset =
      QUALITY_PRESETS.find((p) => p.key === settings.quality) ?? QUALITY_PRESETS[1];
    qualityRef.current = preset.key;

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: settings.fps },
          // @ts-expect-error non-standard but widely supported hints
          displaySurface: settings.mode === "window" ? "window" : "monitor",
          cursor: settings.cursor ? "always" : "never",
        },
        audio: settings.systemAudio,
      });
      streamsRef.current.push(display);

      const tracks: MediaStreamTrack[] = [...display.getVideoTracks()];
      const audioSources: MediaStream[] = [];
      if (settings.systemAudio && display.getAudioTracks().length > 0) {
        audioSources.push(new MediaStream(display.getAudioTracks()));
      }

      if (settings.microphone) {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamsRef.current.push(mic);
        audioSources.push(mic);
      }

      if (audioSources.length > 0) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const destination = ctx.createMediaStreamDestination();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        audioSources.forEach((s) => {
          const src = ctx.createMediaStreamSource(s);
          src.connect(destination);
          src.connect(analyser);
        });
        tracks.push(...destination.stream.getAudioTracks());

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(buffer);
          let peak = 0;
          for (let i = 0; i < buffer.length; i += 1) {
            peak = Math.max(peak, Math.abs(buffer[i] - 128) / 128);
          }
          setLevel(peak);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }

      const mixed = new MediaStream(tracks);
      setStream(mixed);

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(mixed, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: preset.bitrate,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setRecordings((prev) => [
          {
            id: crypto.randomUUID(),
            name: `Recording ${new Date().toLocaleString()}`,
            url: URL.createObjectURL(blob),
            size: blob.size,
            duration: seconds,
            createdAt: Date.now(),
            quality: qualityRef.current,
          },
          ...prev,
        ]);
        chunksRef.current = [];
        cleanup();
        setStatus("idle");
        setElapsed(0);
      };

      display.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      });

      recorderRef.current = recorder;
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setStatus("recording");
    } catch (e) {
      cleanup();
      const message = e instanceof Error ? e.message : "Could not start the capture.";
      setError(
        message.includes("Permission") || message.includes("denied")
          ? "Screen capture permission was declined."
          : message,
      );
      setStatus("idle");
    }
  }, [cleanup, settings]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const togglePause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setStatus("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      startedAtRef.current = Date.now() - elapsed * 1000;
      setStatus("recording");
    }
  }, [elapsed]);

  const remove = useCallback((id: string) => {
    setRecordings((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  return { status, elapsed, level, error, recordings, stream, start, stop, togglePause, remove };
}
