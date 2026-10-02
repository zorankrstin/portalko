/**
 * Email service for sending and managing noreply account confirmation emails.
 */

export interface SendVerificationEmailParams {
  name: string;
  email: string;
  token: string;
  confirmationUrl: string;
}

export interface SendVerificationEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

/**
 * Builds responsive, branded HTML email for user confirmation.
 */
export function generateVerificationEmailHtml({ name, confirmationUrl }: { name: string; confirmationUrl: string }): string {
  const currentYear = new Date().getFullYear();
  const safeName = name ? name.trim() : 'Uporabnik';

  return `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potrdite svoj račun na Portalko.net</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .tagline {
      font-size: 13px;
      opacity: 0.9;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7c3aed;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }
    .link-box {
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      word-break: break-all;
      color: #64748b;
      margin-top: 20px;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      background-color: #fafafa;
      padding: 20px 28px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
    }
    .noreply-badge {
      display: inline-block;
      background-color: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">Portalko.net</h1>
        <p class="tagline">Slovenski portal za novice, male oglase, dogodke in ugodnosti</p>
      </div>
      <div class="content">
        <p class="greeting">Pozdravljeni, ${safeName}!</p>
        <p class="text">
          Hvala za registracijo na portalu <strong>Portalko.net</strong>. Za zaključek registracije in aktivacijo vašega uporabniškega računa prosimo potrdite vaš e-poštni naslov s klikom na spodnji gumb:
        </p>
        
        <div class="btn-container">
          <a href="${confirmationUrl}" class="btn" target="_blank" rel="noopener noreferrer">
            Potrdi moj račun
          </a>
        </div>

        <p class="text" style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
          Če gumb zgoraj ne deluje, kopirajte naslednjo povezavo neposredno v vaš spletni brskalnik:
        </p>
        <div class="link-box">
          <a href="${confirmationUrl}" style="color: #7c3aed; text-decoration: underline;">${confirmationUrl}</a>
        </div>

        <p class="text" style="font-size: 13px; color: #64748b; margin-top: 24px; margin-bottom: 0;">
          Povezava je veljavna 24 ur. Po potrditvi se boste lahko takoj prijavili in v polnosti uporabljali vse funkcionalnosti portala.
        </p>
      </div>

      <div class="footer">
        <div class="noreply-badge">Samodejno sporočilo • Ne odgovarjajte</div>
        <p style="margin: 4px 0;">
          To sporočilo je bilo samodejno poslano iz e-poštnega naslova <strong>noreply@portalko.net</strong>. Če se niste registrirali na Portalko.net, lahko to sporočilo mirno prezrete.
        </p>
        <p style="margin: 8px 0 0 0;">
          © ${currentYear} Portalko.net. Vse pravice pridržane.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers the noreply email dispatch via server endpoint.
 */
export async function sendNoreplyConfirmationEmail(params: SendVerificationEmailParams): Promise<SendVerificationEmailResult> {
  try {
    const res = await fetch('/api/auth/send-verification-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Strežnik je vrnil napako: ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.messageId,
      previewUrl: data.previewUrl,
    };
  } catch (err: any) {
    console.error('Napaka pri klicu API za pošiljanje potrditvene e-pošte:', err);
    return {
      success: false,
      error: err.message || 'Napaka pri povezavi s strežnikom za pošiljanje e-pošte.',
    };
  }
}
