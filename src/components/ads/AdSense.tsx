import React, { useEffect, useRef, useState } from 'react';

export interface AdSenseProps {
  client?: string;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AdSense({
  client,
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style
}: AdSenseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const hasPushedRef = useRef(false);
  const [isReadyToPush, setIsReadyToPush] = useState(false);

  // Resolve client ID: prop or environment variable
  const effectiveClient = (client || (import.meta.env.VITE_ADSENSE_CLIENT_ID as string) || '').trim();
  const effectiveSlot = (slot || (import.meta.env.VITE_ADSENSE_SLOT_ID as string) || '').trim();

  // A valid AdSense client ID begins with 'ca-pub-' and does not contain dummy placeholders like 'XXXX'
  const isValidClient = Boolean(
    effectiveClient &&
    effectiveClient.startsWith('ca-pub-') &&
    !effectiveClient.includes('XXXX') &&
    effectiveSlot &&
    !effectiveSlot.includes('XXXX')
  );

  // 1. Dynamically inject Google AdSense script only when a real client ID is configured
  useEffect(() => {
    if (!isValidClient) return;

    const scriptId = 'google-adsense-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${effectiveClient}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [isValidClient, effectiveClient]);

  // 2. Measure available width before attempting any adsbygoogle.push()
  // This completely eliminates "No slot size for availableWidth=0"
  useEffect(() => {
    if (!isValidClient) return;

    const checkWidth = () => {
      const el = containerRef.current || insRef.current;
      if (!el) return false;
      const width = el.getBoundingClientRect().width || el.offsetWidth;
      return width > 0;
    };

    if (checkWidth()) {
      setIsReadyToPush(true);
      return;
    }

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setIsReadyToPush(true);
            ro.disconnect();
            break;
          }
        }
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [isValidClient]);

  // 3. Safe push to adsbygoogle queue once container has available width and is uninitialized
  // This completely eliminates "All 'ins' elements in the DOM with class=adsbygoogle already have ads in them"
  useEffect(() => {
    if (!isValidClient || !isReadyToPush) return;
    if (hasPushedRef.current) return;

    const ins = insRef.current;
    if (!ins) return;

    // Verify element has positive dimensions
    if (ins.offsetWidth === 0 && ins.getBoundingClientRect().width === 0) {
      return;
    }

    // Verify element has not already been populated by AdSense
    if (
      ins.getAttribute('data-adsbygoogle-status') === 'done' ||
      ins.hasAttribute('data-ad-status')
    ) {
      hasPushedRef.current = true;
      return;
    }

    try {
      hasPushedRef.current = true;
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // Gracefully handle any benign AdSense initialization warning without re-throwing
    }
  }, [isValidClient, isReadyToPush]);

  // If no valid Google AdSense client credentials are configured,
  // display a clean, elegant sponsored space placeholder matching the portal design
  if (!isValidClient) {
    return (
      <div 
        ref={containerRef} 
        className={`adsense-container my-3 ${className}`}
        style={style}
      >
        <div className="w-full py-3.5 px-4 rounded-2xl bg-surface-container-low/60 border border-dashed border-surface-container-high hover:border-primary/40 transition-colors flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-outline">
            <span>Oglasni prostor</span>
            <span className="w-1 h-1 rounded-full bg-outline/40"></span>
            <span className="text-primary font-medium">Partnerji Portala</span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">
            Rezervirano za sponzorirane vsebine in lokalne ponudbe
          </p>
        </div>
      </div>
    );
  }

  // Real AdSense slot when valid credentials are provided
  return (
    <div 
      ref={containerRef} 
      className={`adsense-container my-3 overflow-hidden ${className}`}
      style={style}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90, ...style }}
        data-ad-client={effectiveClient}
        data-ad-slot={effectiveSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
