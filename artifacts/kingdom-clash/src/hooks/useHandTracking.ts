import { useEffect, useRef, useState, useCallback } from "react";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

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
const TWO_FINGER_THRESHOLD = 0.08;

export function useHandTracking(
  canvasWidth: number,
  canvasHeight: number,
  onHold: (x: number, y: number) => void
): HandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gestureRef = useRef<GestureRecognizer | null>(null);
  const animRef = useRef<number>(0);
  const holdTimerRef = useRef<number>(0);
  const holdFiredRef = useRef(false);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdFired, setHoldFired] = useState(false);

  const holdFiredFlagRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (!mounted) return;
        gestureRef.current = recognizer;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        await new Promise<void>((res) => {
          video.onloadeddata = () => res();
        });
        videoRef.current = video;
        if (mounted) setIsReady(true);
      } catch (e: any) {
        if (mounted) setError(e.message || "Camera/MediaPipe error");
      }
    }

    init();
    return () => {
      mounted = false;
      stream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
      gestureRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    let lastTime = 0;

    function loop(ts: number) {
      animRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      const recognizer = gestureRef.current;
      if (!video || !recognizer || video.readyState < 2) return;

      if (ts - lastTime < 50) return;
      lastTime = ts;

      const results = recognizer.recognizeForVideo(video, ts);
      const landmarks = results?.landmarks?.[0];

      if (!landmarks || landmarks.length === 0) {
        setHandDetected(false);
        setCursor(null);
        lastCursorRef.current = null;
        holdTimerRef.current = 0;
        holdFiredFlagRef.current = false;
        setHoldProgress(0);
        setHoldFired(false);
        return;
      }

      setHandDetected(true);

      const indexTip = landmarks[8];
      const cx = (1 - indexTip.x) * canvasWidth;
      const cy = indexTip.y * canvasHeight;

      setCursor({ x: cx, y: cy });
      lastCursorRef.current = { x: cx, y: cy };

      const middleTip = landmarks[12];
      const indexMCP = landmarks[5];
      const handSize = Math.hypot(
        landmarks[0].x - indexMCP.x,
        landmarks[0].y - indexMCP.y
      );
      const twoFingerDist = Math.hypot(
        indexTip.x - middleTip.x,
        indexTip.y - middleTip.y
      );
      const normalizedDist = handSize > 0 ? twoFingerDist / handSize : twoFingerDist;
      const isTwoFinger = normalizedDist < TWO_FINGER_THRESHOLD;

      if (isTwoFinger) {
        holdTimerRef.current += 0.05;
        const progress = Math.min(holdTimerRef.current / HOLD_DURATION, 1);
        setHoldProgress(progress);

        if (progress >= 1 && !holdFiredFlagRef.current) {
          holdFiredFlagRef.current = true;
          setHoldFired(true);
          onHold(cx, cy);
          setTimeout(() => setHoldFired(false), 100);
          holdTimerRef.current = 0;
          setHoldProgress(0);
        }
      } else {
        holdTimerRef.current = Math.max(0, holdTimerRef.current - 0.03);
        holdFiredFlagRef.current = false;
        setHoldProgress(holdTimerRef.current / HOLD_DURATION);
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, canvasWidth, canvasHeight, onHold]);

  return { cursor, holdProgress, holdFired, handDetected, videoRef, isReady, error };
}
