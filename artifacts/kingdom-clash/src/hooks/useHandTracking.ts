import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface HandTrackingResult {
  cursor: { x: number; y: number } | null;
  holdProgress: number;
  holdFired: boolean;
  handDetected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  error: string | null;
}

const HOLD_DURATION = 0.6;
const TWO_FINGER_THRESHOLD = 0.12;

export function useHandTracking(
  viewportWidth: number,
  viewportHeight: number,
  onHold: (x: number, y: number) => void
): HandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const holdTimerRef = useRef<number>(0);
  const holdFiredFlagRef = useRef(false);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdFired, setHoldFired] = useState(false);

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (!mounted) return;
        landmarkerRef.current = landmarker;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error("Video load error"));
          setTimeout(() => resolve(), 5000);
        });

        await video.play().catch(() => {});
        videoRef.current = video;
        if (mounted) setIsReady(true);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Camera or MediaPipe failed to initialize");
      }
    }

    init();
    return () => {
      mounted = false;
      stream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    let lastTs = 0;

    function loop(ts: number) {
      animRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2 || video.paused) return;

      if (ts - lastTs < 33) return;
      lastTs = ts;

      let results;
      try {
        results = landmarker.detectForVideo(video, ts);
      } catch {
        return;
      }

      const landmarks = results?.landmarks?.[0];

      if (!landmarks || landmarks.length === 0) {
        setHandDetected(false);
        setCursor(null);
        holdTimerRef.current = 0;
        holdFiredFlagRef.current = false;
        setHoldProgress(0);
        return;
      }

      setHandDetected(true);

      const indexTip = landmarks[8];

      const cx = (1 - indexTip.x) * viewportWidth;
      const cy = indexTip.y * viewportHeight;

      setCursor({ x: cx, y: cy });

      const middleTip = landmarks[12];
      const wrist = landmarks[0];
      const indexMCP = landmarks[5];

      const handSize = Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y) || 0.1;
      const fingerDist = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);
      const normalizedDist = fingerDist / handSize;

      const isTwoFinger = normalizedDist < TWO_FINGER_THRESHOLD;

      if (isTwoFinger) {
        holdTimerRef.current = Math.min(holdTimerRef.current + 0.05, HOLD_DURATION + 0.05);
        const progress = Math.min(holdTimerRef.current / HOLD_DURATION, 1);
        setHoldProgress(progress);

        if (progress >= 1 && !holdFiredFlagRef.current) {
          holdFiredFlagRef.current = true;
          setHoldFired(true);
          onHoldRef.current(cx, cy);
          setTimeout(() => setHoldFired(false), 100);
          holdTimerRef.current = 0;
          setHoldProgress(0);
        }
      } else {
        holdTimerRef.current = Math.max(0, holdTimerRef.current - 0.04);
        if (holdTimerRef.current === 0) {
          holdFiredFlagRef.current = false;
        }
        setHoldProgress(Math.max(0, holdTimerRef.current / HOLD_DURATION));
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, viewportWidth, viewportHeight]);

  return { cursor, holdProgress, holdFired, handDetected, videoRef, isReady, error };
}
