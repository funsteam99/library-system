"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type BarcodeScannerHandle = {
  start: (
    cameraConfig: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number }; aspectRatio: number },
    onSuccess: (decodedText: string) => void,
    onError: (errorMessage: string) => void,
  ) => Promise<unknown>;
  stop: () => Promise<void>;
  clear: () => void;
  getRunningTrackCapabilities: () => MediaTrackCapabilities;
  applyVideoConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
};

type BarcodeScannerProps = {
  label: string;
  helperText?: string;
  onDetected: (code: string) => void;
  preferredZoom?: number;
};

function isIosUserAgent(userAgent: string) {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function BarcodeScanner({
  label,
  helperText,
  onDetected,
  preferredZoom = 2,
}: BarcodeScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<BarcodeScannerHandle | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("等待啟動掃描器");
  const [cameraSupported, setCameraSupported] = useState(true);
  const [secureHint, setSecureHint] = useState<string | null>(null);
  const [selectedZoom, setSelectedZoom] = useState(preferredZoom);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [hardwareZoomActive, setHardwareZoomActive] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === "undefined") {
      return;
    }

    const secure = window.isSecureContext;
    const ios = isIosUserAgent(window.navigator.userAgent);

    if (!secure) {
      setCameraSupported(false);
      setSecureHint(
        ios
          ? "iPhone 需要在 HTTPS 環境下才能開啟相機，請改用 Safari 開啟內網 HTTPS 網址。"
          : "相機需要安全環境才能啟用，請改用 HTTPS 或 localhost。",
      );
      setStatus("目前環境不支援相機");
      return;
    }

    setCameraSupported(true);
    setSecureHint(null);
  }, []);

  useEffect(() => {
    setSelectedZoom(preferredZoom);
  }, [preferredZoom]);

  async function applyZoom(nextZoom: number) {
    setSelectedZoom(nextZoom);

    const scanner = scannerRef.current;
    const range = zoomRange;

    if (!scanner || !range) {
      setStatus(`已切換為 ${nextZoom.toFixed(1)}x 預覽倍率`);
      return;
    }

    const appliedZoom = Math.min(Math.max(nextZoom, range.min), range.max);

    try {
      await scanner.applyVideoConstraints({
        advanced: [{ zoom: appliedZoom } as MediaTrackConstraintSet],
      });
      setHardwareZoomActive(true);
      setStatus(`相機已套用 ${appliedZoom.toFixed(1)}x 變焦`);
    } catch {
      setHardwareZoomActive(false);
      setStatus(`硬體變焦不可用，已改用 ${appliedZoom.toFixed(1)}x 預覽倍率`);
    }
  }

  useEffect(() => {
    if (!isOpen || !isMounted) {
      return;
    }

    const region = document.getElementById(regionId);
    const video = region?.querySelector("video");

    if (!video) {
      return;
    }

    if (hardwareZoomActive) {
      video.style.transform = "scale(1)";
    } else {
      video.style.transform = `scale(${Math.max(selectedZoom, 1)})`;
    }

    video.style.transformOrigin = "center center";
  }, [hardwareZoomActive, isMounted, isOpen, regionId, selectedZoom]);

  useEffect(() => {
    if (!isOpen || !isMounted || !cameraSupported) {
      return;
    }

    let mounted = true;
    let scannerInstance: BarcodeScannerHandle | null = null;

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        if (!mounted) {
          return;
        }

        const scanner = new Html5Qrcode(regionId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        }) as BarcodeScannerHandle;

        scannerInstance = scanner;
        scannerRef.current = scanner;
        setStatus("相機啟動中...");

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 140 },
            aspectRatio: 2,
          },
          (decodedText: string) => {
            if (!mounted) {
              return;
            }

            onDetected(decodedText);
            setStatus(`已掃描：${decodedText}`);
            setIsOpen(false);
          },
          () => {
            if (mounted) {
              setStatus("相機已啟動，請將條碼對準掃描框。");
            }
          },
        );

        try {
          const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
            zoom?: { min?: number; max?: number };
          };

          if (typeof capabilities.zoom === "object" && capabilities.zoom) {
            const nextRange = {
              min: capabilities.zoom.min ?? 1,
              max: capabilities.zoom.max ?? 3,
            };
            if (mounted) {
              setZoomRange(nextRange);
            }
            const appliedZoom = Math.min(
              Math.max(selectedZoom, nextRange.min),
              nextRange.max,
            );
            await scanner.applyVideoConstraints({
              advanced: [{ zoom: appliedZoom } as MediaTrackConstraintSet],
            });
            if (mounted) {
              setHardwareZoomActive(true);
              setStatus(`相機已啟動，已套用 ${appliedZoom.toFixed(1)}x 變焦`);
            }
          } else if (mounted) {
            setZoomRange(null);
            setHardwareZoomActive(false);
            setStatus(`相機已啟動，裝置不支援硬體變焦；目前使用 ${selectedZoom.toFixed(1)}x 預覽倍率。`);
          }
        } catch {
          if (mounted) {
            setZoomRange(null);
            setHardwareZoomActive(false);
            setStatus(`相機已啟動，但無法調整硬體變焦；目前使用 ${selectedZoom.toFixed(1)}x 預覽倍率。`);
          }
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "無法啟動掃描器");
      }
    }

    void startScanner();

    return () => {
      mounted = false;
      scannerRef.current = null;
      setZoomRange(null);
      setHardwareZoomActive(false);

      if (scannerInstance) {
        void scannerInstance.stop().catch(() => undefined).finally(() => {
          scannerInstance?.clear();
        });
      }
    };
  }, [cameraSupported, isMounted, isOpen, onDetected, regionId, selectedZoom]);

  const effectiveHelperText = useMemo(() => {
    if (secureHint) {
      return secureHint;
    }

    return helperText ?? "開啟相機後可直接掃描書籍條碼或 ISBN。";
  }, [helperText, secureHint]);

  return (
    <section className="scanner-card">
      <div className="scanner-head">
        <div>
          <p className="eyebrow">Camera scan</p>
          <h3>{label}</h3>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={!cameraSupported}
        >
          {isOpen ? "關閉掃描" : "開啟掃描"}
        </button>
      </div>

      <p className="scanner-text">{effectiveHelperText}</p>

      <div className="inline-actions">
        {[1, 2, 3].map((zoom) => (
          <button
            key={zoom}
            type="button"
            className={`ghost-button ${selectedZoom === zoom ? "zoom-button-active" : ""}`}
            onClick={() => void applyZoom(zoom)}
            disabled={!cameraSupported}
          >
            {zoom}x
          </button>
        ))}
      </div>

      {isMounted && isOpen && cameraSupported ? (
        <div id={regionId} className="scanner-region" />
      ) : null}

      <div className="scanner-status">
        {status}
        {zoomRange ? ` 可用倍率 ${zoomRange.min.toFixed(1)}x - ${zoomRange.max.toFixed(1)}x` : ""}
      </div>
    </section>
  );
}
