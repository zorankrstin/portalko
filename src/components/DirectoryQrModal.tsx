import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, QrCode, Globe, ContactRound, MapPin, BadgeCheck } from 'lucide-react';
import type { DirectoryEntry } from '../services/directoryService';

interface DirectoryQrModalProps {
  entry: DirectoryEntry | null;
  onClose: () => void;
}

type QrMode = 'vcard' | 'url';

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildBusinessVCard(entry: DirectoryEntry): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(entry.name)}`,
    `ORG:${escapeVCardValue(entry.name)}`,
    `URL:${entry.url}`,
  ];
  if (entry.location?.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(entry.location.trim())};;;;Slovenija`);
  }
  const noteParts = [entry.categoryName, entry.description].filter(Boolean);
  if (noteParts.length > 0) {
    lines.push(`NOTE:${escapeVCardValue(noteParts.join(' — ').slice(0, 180))}`);
  }
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function DirectoryQrModal({ entry, onClose }: DirectoryQrModalProps) {
  const [mode, setMode] = useState<QrMode>('vcard');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const payload = useMemo(() => {
    if (!entry) return '';
    return mode === 'vcard' ? buildBusinessVCard(entry) : entry.url;
  }, [entry, mode]);

  useEffect(() => {
    if (!entry || !payload) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    setIsGenerating(true);
    QRCode.toDataURL(payload, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
        if (!cancelled) setQrDataUrl('');
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry, payload]);

  if (!entry) return null;

  const safeSlug = entry.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'podjetje';

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${safeSlug}-qr-${mode}.png`;
    link.click();
  };

  const handleDownloadVCard = () => {
    const vcard = buildBusinessVCard(entry);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeSlug}.vcf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <h2 className="text-sm font-bold text-on-surface truncate">{entry.name}</h2>
                {entry.isVerified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant truncate">{entry.domain}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low cursor-pointer shrink-0"
            aria-label="Zapri QR kodo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-container-low border border-surface-container">
          <button
            type="button"
            onClick={() => setMode('vcard')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'vcard'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <ContactRound className="w-3.5 h-3.5" />
            <span>Vizitka (vCard)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'url'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Spletna stran</span>
          </button>
        </div>

        {/* QR Code Preview */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-surface-container shadow-xs flex items-center justify-center w-[240px] h-[240px]">
            {isGenerating ? (
              <span className="text-xs text-outline font-medium">Generiram QR kodo...</span>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR koda za ${entry.name}`}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <span className="text-xs text-error font-medium">QR kode ni bilo mogoče ustvariti.</span>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant text-center leading-relaxed">
            {mode === 'vcard'
              ? 'Skenirajte s kamero telefona za takojšnje shranjevanje kontaktne vizitke podjetja.'
              : 'Skenirajte s kamero telefona za neposredno odpiranje spletne strani.'}
          </p>
          {entry.location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-outline">
              <MapPin className="w-3 h-3" />
              <span>{entry.location} • {entry.categoryName}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!qrDataUrl}
            className="flex-1 px-3 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Prenesi QR</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadVCard}
            className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-surface-container inline-flex items-center justify-center gap-1.5 cursor-pointer"
            title="Prenesi .vcf datoteko za imenik"
          >
            <ContactRound className="w-3.5 h-3.5 text-primary" />
            <span>.vcf</span>
          </button>
        </div>
      </div>
    </div>
  );
}
