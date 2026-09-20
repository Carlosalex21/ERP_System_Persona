"use client";

import { useEffect, useRef, type ReactElement } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** QR generado 100% en el navegador (sin depender de un servicio externo que reciba la URL a codificar). */
export default function QrCode({ value, size = 200, className }: QrCodeProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }).catch(() => {/* deja el canvas en blanco */});
  }, [value, size]);

  return <canvas ref={canvasRef} className={className} width={size} height={size} />;
}
