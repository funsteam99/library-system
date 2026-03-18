"use client";

import { useEffect, useId, useMemo, useState } from "react";

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
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("待命中");
  const [cameraSupported, setCameraSupported] = useState(true);
  const [secureHint, setSecureHint] = useState<string | null>(null);

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
          ? "iPhone 的瀏覽器相機需要 HTTPS 安全連線。現在這個內網網址不是安全環境，所以 Safari 無法開相機。"
          : "這個瀏覽器目前不在安全環境中。相機掃碼通常需要 HTTPS 或 localhost。",
      );
      setStatus("目前無法啟用相機");
      return;
    }

    setCameraSupported(true);
    setSecureHint(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !isMounted || !cameraSupported) {
      return;
    }

    let mounted = true;
    let scannerInstance: {
      stop: () => Promise<void>;
      clear: () => void;
      getRunningTrackCapabilities: () => MediaTrackCapabilities;
      applyVideoConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
    } | null = null;

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
        });

        scannerInstance = scanner;
        setStatus("相機啟動中...");

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 140 },
            aspectRatio: 2,
          },
          (decodedText) => {
            if (!mounted) {
              return;
            }

            onDetected(decodedText);
            setStatus(`已掃到：${decodedText}`);
            setIsOpen(false);
          },
          () => {
            if (mounted) {
              setStatus("請把條碼對準框線");
            }
          },
        );

        try {
          const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
            zoom?: { min?: number; max?: number };
          };
          const zoomCapability = capabilities.zoom;

          if (typeof zoomCapability === "object" && zoomCapability) {
            const nextZoom = Math.min(
              Math.max(preferredZoom, zoomCapability.min ?? preferredZoom),
              zoomCapability.max ?? preferredZoom,
            );

            await scanner.applyVideoConstraints({
              advanced: [{ zoom: nextZoom } as MediaTrackConstraintSet],
            });

            if (mounted) {
              setStatus(`相機已啟動，已套用 ${nextZoom.toFixed(1)}x 變焦`);
            }
          } else if (mounted) {
            setStatus("相機已啟動，但這支手機不支援變焦控制");
          }
        } catch {
          if (mounted) {
            setStatus("相機已啟動，變焦控制未支援");
          }
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "無法啟動相機");
      }
    }

    void startScanner();

    return () => {
      mounted = false;

      if (scannerInstance) {
        void scannerInstance.stop().catch(() => undefined).finally(() => {
          scannerInstance?.clear();
        });
      }
    };
  }, [cameraSupported, isMounted, isOpen, onDetected, preferredZoom, regionId]);

  const effectiveHelperText = useMemo(() => {
    if (secureHint) {
      return secureHint;
    }

    return helperText ?? "使用手機後鏡頭掃描條碼。";
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
          {isOpen ? "關閉相機" : "開啟掃碼"}
        </button>
      </div>

      <p className="scanner-text">{effectiveHelperText}</p>

      {isMounted && isOpen && cameraSupported ? (
        <div id={regionId} className="scanner-region" />
      ) : null}

      <div className="scanner-status">{status}</div>
    </section>
  );
}
