import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface HandTrackingResult {
  cursor: { x: number; y: number } | null;
  isPinching: boolean;
  handDetected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  error: string | null;
}

// Hysteresis: enter pinch when distance drops below PINCH_ENTER,
// stay pinched until it rises above PINCH_EXIT.
// Real-world thumb-index pinch normalized to hand size reads ~0.10–0.20.
const PINCH_ENTER = 0.20;
const PINCH_EXIT  = 0.28;

export function useHandTracking(
  viewportWidth: number,
  viewportHeight: number,
  onPinchStart: (x: number, y: number) => void,
  onPinchEnd: (x: number, y: number) => void
): HandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animRef = useRef<number>(0);

  const onPinchStartRef = useRef(onPinchStart);
  const onPinchEndRef = useRef(onPinchEnd);
  onPinchStartRef.current = onPinchStart;
  onPinchEndRef.current = onPinchEnd;

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPinchingRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

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
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        await new Promise<void>(resolve => {
          video.onloadeddata = () => resolve();
          setTimeout(resolve, 5000);
        });
        await video.play().catch(() => {});
        videoRef.current = video;
        if (mounted) setIsReady(true);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Camera / MediaPipe failed");
      }
    }

    init();
    return () => {
      mounted = false;
      stream?.getTracks().forEach(t => t.stop());
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
      try { results = landmarker.detectForVideo(video, ts); } catch { return; }

      const landmarks = results?.landmarks?.[0];
      if (!landmarks || landmarks.length === 0) {
        if (isPinchingRef.current && cursorRef.current) {
          isPinchingRef.current = false;
          setIsPinching(false);
          onPinchEndRef.current(cursorRef.current.x, cursorRef.current.y);
        }
        setHandDetected(false);
        setCursor(null);
        cursorRef.current = null;
        return;
      }

      setHandDetected(true);

      // Index finger tip = landmark 8, thumb tip = landmark 4
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const wrist = landmarks[0];
      const indexMCP = landmarks[5];

      const cx = (1 - indexTip.x) * viewportWidth;
      const cy = indexTip.y * viewportHeight;
      setCursor({ x: cx, y: cy });
      cursorRef.current = { x: cx, y: cy };

      // Normalize pinch distance by hand size
      const handSize = Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y) || 0.1;
      const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      const normalizedPinch = pinchDist / handSize;

      const wasPinching = isPinchingRef.current;
      // Hysteresis: only change state when crossing the appropriate threshold
      const nowPinching = wasPinching
        ? normalizedPinch < PINCH_EXIT    // already pinching → stay until fingers open
        : normalizedPinch < PINCH_ENTER;  // not pinching → start when fingers close

      if (nowPinching !== wasPinching) {
        isPinchingRef.current = nowPinching;
        setIsPinching(nowPinching);
        if (nowPinching) {
          onPinchStartRef.current(cx, cy);
        } else {
          onPinchEndRef.current(cx, cy);
        }
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, viewportWidth, viewportHeight]);

  return { cursor, isPinching, handDetected, videoRef, isReady, error };
}
