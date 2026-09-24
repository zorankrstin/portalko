import React, { useEffect } from 'react';

// NOTE: You must replace 'YOUR_AD_CLIENT' and 'YOUR_AD_SLOT' with your actual AdSense values.
// The Google AdSense script should be loaded in the <head> of your index.html.

export function AdSense({ client = 'ca-pub-XXXXXXXXXXXXXXXX', slot = 'XXXXXXXXXX' }) {
  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="adsense-container my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
