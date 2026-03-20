"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CameraCaptureProps = {
  label?: string;
  onCapture: (file: File, previewUrl: string) => void;
};

const DEFAULT_ZOOM = 2;

export function CameraCapture({
  label = "封面拍照",
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const supported = useMemo(() => {
    return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsReady(false);
  }

  async function startCamera() {
    if (!supported) {
      setStatus("這台裝置或瀏覽器不支援相機拍照。");
      return;
    }

    setIsStarting(true);
    setStatus(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsReady(true);

      try {
        const [videoTrack] = stream.getVideoTracks();
        const capabilities = videoTrack?.getCapabilities?.() as MediaTrackCapabilities & {
          zoom?: { min?: number; max?: number };
        };
        const zoomCapability = capabilities?.zoom;

        if (typeof zoomCapability === "object" && zoomCapability) {
          const nextZoom = Math.min(
            Math.max(DEFAULT_ZOOM, zoomCapability.min ?? DEFAULT_ZOOM),
            zoomCapability.max ?? DEFAULT_ZOOM,
          );

          await videoTrack.applyConstraints({
            advanced: [{ zoom: nextZoom } as MediaTrackConstraintSet],
          });

          setStatus(`相機已啟動，已套用 ${nextZoom.toFixed(1)}x 變焦`);
        } else {
          setStatus("相機已啟動，裝置不支援變焦控制");
        }
      } catch {
        setStatus("相機已啟動，變焦套用失敗，已使用原始倍率");
      }
    } catch {
      setStatus("無法開啟相機，請確認瀏覽器權限已允許。");
      stopCamera();
    } finally {
      setIsStarting(false);
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth || 960;
    const height = video.videoHeight || 1280;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("無法取得拍照畫布。");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setStatus("照片擷取失敗，請再試一次。");
      return;
    }

    const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    const previewUrl = URL.createObjectURL(file);
    onCapture(file, previewUrl);
    setStatus("照片已套用到表單。");
    stopCamera();
  }

  return (
    <section className="camera-card">
      <div className="camera-head">
        <div>
          <h3>{label}</h3>
          <p className="scanner-text">
            桌機 Chrome 也可直接啟用 webcam 拍照，系統會先嘗試套用 2x 變焦。
          </p>
        </div>
      </div>

      <div className="camera-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => void startCamera()}
          disabled={isStarting}
        >
          {isStarting ? "啟動中..." : "開啟相機"}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={handleCapture}
          disabled={!isReady}
        >
          拍照套用
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={stopCamera}
          disabled={!isReady}
        >
          關閉相機
        </button>
      </div>

      <div className="camera-preview-shell">
        <video ref={videoRef} className="camera-video" playsInline muted />
        <canvas ref={canvasRef} hidden />
      </div>

      {status ? <div className="scanner-status">{status}</div> : null}
    </section>
  );
}
