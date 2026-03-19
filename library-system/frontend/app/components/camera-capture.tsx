"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CameraCaptureProps = {
  label?: string;
  onCapture: (file: File, previewUrl: string) => void;
};

export function CameraCapture({ label = "使用相機拍照", onCapture }: CameraCaptureProps) {
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
      setStatus("這台裝置或瀏覽器不支援相機，請改用選檔。");
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
      setStatus("相機已啟動，可以直接拍封面。");
    } catch {
      setStatus("無法啟動相機，請確認瀏覽器權限或改用選檔。");
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
      setStatus("目前無法處理相機畫面。");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setStatus("拍照失敗，請再試一次。");
      return;
    }

    const file = new File([blob], `book-cover-${Date.now()}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(file);
    onCapture(file, previewUrl);
    setStatus("已拍下封面照片。");
    stopCamera();
  }

  return (
    <section className="camera-card">
      <div className="camera-head">
        <div>
          <h3>{label}</h3>
          <p className="scanner-text">桌機 Chrome 或筆電相機都可以直接拍照後套用成封面。</p>
        </div>
      </div>

      <div className="camera-actions">
        <button type="button" className="ghost-button" onClick={() => void startCamera()} disabled={isStarting}>
          {isStarting ? "啟動中..." : "開啟相機"}
        </button>
        <button type="button" className="ghost-button" onClick={handleCapture} disabled={!isReady}>
          拍照套用
        </button>
        <button type="button" className="ghost-button" onClick={stopCamera} disabled={!isReady}>
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
