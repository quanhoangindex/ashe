import { useCallback, useEffect, useRef, useState } from "react";
import {
  QUALITY_PRESETS,
  nativeScreenSize,
  type QualityKey,
  type Recording,
  type RecorderSettings,
} from "./recorder-types";

type Status = "idle" | "recording" | "paused";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

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

type View = { scale: number; cx: number; cy: number };

export function useRecorder(settings: RecorderSettings) {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [zoom, setZoomState] = useState(1);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const startedAtRef = useRef(0);
  const qualityRef = useRef<QualityKey>(settings.quality);
  // Where the recorded frame should be looking (target) and where it is now (smoothed).
  const targetRef = useRef<View>({ scale: 1, cx: 0.5, cy: 0.5 });
  const currentRef = useRef<View>({ scale: 1, cx: 0.5, cy: 0.5 });

  const cleanup = useCallback(() => {
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = null;
    if (sourceVideoRef.current) {
      sourceVideoRef.current.srcObject = null;
      sourceVideoRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setStream(null);
    setLevel(0);
    targetRef.current = { scale: 1, cx: 0.5, cy: 0.5 };
    currentRef.current = { scale: 1, cx: 0.5, cy: 0.5 };
    setZoomState(1);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (status !== "recording") return;
    const id = window.setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 200);
    return () => window.clearInterval(id);
  }, [status]);

  /** Zoom to a level, optionally keeping a point (0..1 of the frame) centered. */
  const setZoom = useCallback((next: number, focus?: { x: number; y: number }) => {
    const scale = clampZoom(next);
    const t = targetRef.current;
    targetRef.current = {
      scale,
      cx: focus ? focus.x : t.cx,
      cy: focus ? focus.y : t.cy,
    };
    setZoomState(scale);
  }, []);

  const nudgeZoom = useCallback(
    (factor: number, focus?: { x: number; y: number }) => {
      setZoom(targetRef.current.scale * factor, focus);
    },
    [setZoom],
  );

  const resetZoom = useCallback(() => {
    targetRef.current = { scale: 1, cx: 0.5, cy: 0.5 };
    setZoomState(1);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const preset = (QUALITY_PRESETS.find((p) => p.key === settings.quality) ??
      QUALITY_PRESETS[1])!;
    qualityRef.current = preset.key;

    try {
      const native = nativeScreenSize();
      // Always grab the screen at its true pixel size, whatever preset is picked.
      // Zooming crops into those pixels, so capturing small is what made zoom blurry.
      const target = native;

      const videoConstraints = {
        width: { ideal: target.width, max: target.width },
        height: { ideal: target.height, max: target.height },
        frameRate: { ideal: settings.fps, max: settings.fps },
        displaySurface: settings.mode === "window" ? "window" : "monitor",
        cursor: settings.cursor ? "always" : "never",
        // Never let the browser rescale the capture — rescaling is what softens text.
        resizeMode: "none",
      } as MediaTrackConstraints;


      const display = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: settings.systemAudio,
      });
      streamsRef.current.push(display);

      const videoTrack = display.getVideoTracks()[0];
      if (videoTrack) {
        // Tell the encoder this is crisp UI/text, not motion video: keeps edges sharp.
        videoTrack.contentHint = "detail";
        try {
          await videoTrack.applyConstraints({
            width: { ideal: target.width },
            height: { ideal: target.height },
            frameRate: { ideal: settings.fps },
            resizeMode: "none",
          } as MediaTrackConstraints);
        } catch {
          /* some browsers reject re-constraining a display track */
        }
      }

      // Feed the capture through a canvas so zoom is baked into the recording.
      const sourceVideo = document.createElement("video");
      sourceVideo.muted = true;
      sourceVideo.playsInline = true;
      sourceVideo.srcObject = new MediaStream(display.getVideoTracks());
      sourceVideoRef.current = sourceVideo;
      await sourceVideo.play().catch(() => {});
      await new Promise<void>((resolve) => {
        if (sourceVideo.videoWidth > 0) return resolve();
        sourceVideo.onloadedmetadata = () => resolve();
        window.setTimeout(resolve, 2000);
      });

      const canvas = document.createElement("canvas");
      canvas.width = sourceVideo.videoWidth || target.width || 1920;
      canvas.height = sourceVideo.videoHeight || target.height || 1080;
      const ctx2d = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = "high";

      targetRef.current = { scale: 1, cx: 0.5, cy: 0.5 };
      currentRef.current = { scale: 1, cx: 0.5, cy: 0.5 };
      setZoomState(1);

      let smoothing = true;
      const draw = () => {
        const W = canvas.width;
        const H = canvas.height;
        const t = targetRef.current;
        const c = currentRef.current;
        // Ease toward the target so zoom/pan glides instead of snapping.
        const e = 0.18;
        c.scale += (t.scale - c.scale) * e;
        c.cx += (t.cx - c.cx) * e;
        c.cy += (t.cy - c.cy) * e;

        // Past ~1.6x every source pixel is stretched; bilinear turns text to mush,
        // so switch to a hard upscale that keeps glyph edges crisp.
        const wantSmoothing = c.scale < 1.6;
        if (wantSmoothing !== smoothing) {
          smoothing = wantSmoothing;
          ctx2d.imageSmoothingEnabled = wantSmoothing;
        }

        // Snap the crop to whole source pixels — sub-pixel crops blur the whole frame.
        const sw = Math.round(W / c.scale);
        const sh = Math.round(H / c.scale);
        const sx = Math.round(Math.min(Math.max(c.cx * W - sw / 2, 0), W - sw));
        const sy = Math.round(Math.min(Math.max(c.cy * H - sh / 2, 0), H - sh));
        if (sourceVideo.readyState >= 2) {
          ctx2d.drawImage(sourceVideo, sx, sy, sw, sh, 0, 0, W, H);
        }

        drawRafRef.current = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(settings.fps);
      const canvasTrack = canvasStream.getVideoTracks()[0];
      if (canvasTrack) canvasTrack.contentHint = "detail";

      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
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
            peak = Math.max(peak, Math.abs((buffer[i] ?? 128) - 128) / 128);
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

  return {
    status,
    elapsed,
    level,
    error,
    recordings,
    stream,
    zoom,
    setZoom,
    nudgeZoom,
    resetZoom,
    start,
    stop,
    togglePause,
    remove,
  };
}
