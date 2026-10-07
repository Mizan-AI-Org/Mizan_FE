import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { compressCanvasToJPEG, embedExifTimestamp, formatExifDate } from "@/lib/image";

type Props = {
  open: boolean;
  onClose: () => void;
  onCaptured: (photoDataUrl: string) => void;
};

// Minimal FaceDetector types to avoid using 'any'
type MinimalFaceBox = { x: number; y: number; width: number; height: number };
type MinimalFace = { boundingBox: MinimalFaceBox };
type MinimalFaceDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<MinimalFace[]> };
type MinimalFaceDetectorCtor = new () => MinimalFaceDetectorInstance;

export const CameraCaptureModal: React.FC<Props> = ({ open, onClose, onCaptured }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
        setError(null);
      } catch {
        setError(t("camera.access_denied"));
      }
    })();
    return () => {
      setStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
    };
  }, [open, t]);

  // Try lightweight face detection if available
  useEffect(() => {
    let raf = 0;
    const detect = async () => {
      try {
        const FaceDetectorCtor = (window as unknown as { FaceDetector?: MinimalFaceDetectorCtor }).FaceDetector;
        if (!FaceDetectorCtor || !videoRef.current) return;
        const fd = new FaceDetectorCtor();
        const faces = await fd.detect(videoRef.current);
        if (faces && faces[0]) {
          const { boundingBox } = faces[0];
          setFaceBox({ x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height });
        } else {
          setFaceBox(null);
        }
      } catch {
        // ignore detection errors
      }
      raf = requestAnimationFrame(detect);
    };
    if (open) {
      raf = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const startCountdownAndCapture = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          capture();
          return 0;
        }
        return c - 1;
      });
    }, 800);
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const w = videoRef.current.videoWidth || 640;
    const h = videoRef.current.videoHeight || 480;
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    // Compress
    const compressed = await compressCanvasToJPEG(canvas, 500 * 1024);
    // Embed EXIF timestamp
    const now = new Date();
    const exifDate = formatExifDate(now);
    const stamped = embedExifTimestamp(compressed.dataUrl, exifDate, `TimeClock capture ${now.toISOString()}`);
    setCapturedPreview(stamped);
  };

  const retake = () => setCapturedPreview(null);
  const confirm = () => {
    if (capturedPreview) onCaptured(capturedPreview);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("camera.dialog_label")}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
    >
      <div className="bg-card rounded-lg shadow-lg w-[92vw] max-w-[720px] p-4">
        <div className="relative">
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          {!capturedPreview ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded relative z-10"
                playsInline
                muted
                aria-label={t("camera.preview_label")}
              />
              {faceBox && (
                <div
                  aria-hidden
                  className="absolute border-2 border-blue-500 rounded z-20"
                  style={{ left: faceBox.x, top: faceBox.y, width: faceBox.width, height: faceBox.height }}
                />
              )}
              {countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-black/60 text-white text-5xl font-bold px-6 py-4 rounded-full" aria-live="polite" aria-atomic="true">
                    {countdown}
                  </div>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button onClick={startCountdownAndCapture} aria-label={t("camera.capture")}>
                  {t("camera.capture")}
                </Button>
                <Button variant="outline" onClick={onClose} aria-label={t("common.cancel")}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <img src={capturedPreview} alt={t("camera.captured_preview")} className="w-full rounded" />
              <div className="mt-3 flex gap-2">
                <Button onClick={confirm} aria-label={t("camera.use_photo")}>
                  {t("camera.use_photo")}
                </Button>
                <Button variant="outline" onClick={retake} aria-label={t("camera.retake")}>
                  {t("camera.retake")}
                </Button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("camera.face_hint")}</p>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
