'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface QRPayload {
  hu_code: string;
  product_name: string;
  qty: number;
  batch: string;
  product_sku: number | string;
  net_weight: number | string;
}

interface QRScannerProps {
  onScan: (data: QRPayload) => void;
  onError?: (message: string) => void;
}

const QR_READER_ID = 'qr-reader-element';
const REQUIRED_FIELDS: (keyof QRPayload)[] = ['hu_code', 'product_name', 'qty', 'batch', 'net_weight'];

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScanned = useRef(false);

  // Stop scanner whenever dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      stopScanner();
    }
  }, [dialogOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore — scanner may already be stopped
      }
      scannerRef.current = null;
    }
    hasScanned.current = false;
  };

  // Called after dialog is fully open and div#qr-reader-element is in the DOM
  const startScanner = async () => {
    setLocalError(null);
    hasScanned.current = false;

    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (hasScanned.current) return;
          hasScanned.current = true;
          handleDecodedText(decodedText);
        },
        () => {
          // per-frame failure — ignore
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      setLocalError(`Camera error: ${message}`);
      onError?.(`Camera error: ${message}`);
      scannerRef.current = null;
    }
  };

  const handleDecodedText = async (decodedText: string) => {
    await stopScanner();
    setDialogOpen(false);

    let parsed: any;
    try {
      parsed = JSON.parse(decodedText);
    } catch {
      const msg = 'QR code content is not valid JSON';
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    const missing = REQUIRED_FIELDS.filter(
      (k) => parsed[k] === undefined || parsed[k] === null || parsed[k] === ''
    );
    if (missing.length > 0) {
      const msg = `QR code missing fields: ${missing.join(', ')}`;
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    onScan({
      hu_code: String(parsed.hu_code),
      product_name: String(parsed.product_name),
      qty: Number(parsed.qty),
      batch: String(parsed.batch),
      net_weight: Number(parsed.net_weight),
      product_sku: String(parsed.product_sku),
    });
  };

  return (
    <div className="w-full space-y-3">
      {/* Trigger button */}
      <button
        onClick={() => setDialogOpen(true)}
        className="w-full bg-violet-600 hover:bg-violet-700 text-base sm:text-lg lg:text-xl font-bold text-white py-4 px-6 rounded-lg flex items-center justify-center gap-3"
      >
        <QrCode className="w-6 h-6" />
        Scan QR Code
      </button>

      {/* Local error shown outside dialog (parse/validation errors after scan) */}
      {localError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      {/* Scanner Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-sm"
          // Start scanner only after the dialog is fully mounted in DOM
          onAnimationEnd={startScanner}
        >
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point the camera at the HU label QR code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* html5-qrcode mounts the video feed into this div */}
            <div
              id={QR_READER_ID}
              className="w-full rounded-lg overflow-hidden bg-black"
            />

            {localError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}

            <button
              onClick={() => setDialogOpen(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-base font-bold text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}