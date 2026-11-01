import type { Handler, HandlerEvent } from "@netlify/functions";

interface EmailConfig {
  resendApiKey: string;
  resendSenderEmail: string;
  resendSenderName: string;
  brevoApiKey: string;
  brevoSenderEmail: string;
  brevoSenderName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

let inMemoryConfigCache: EmailConfig | null = null;
let lastCacheTime = 0;

/**
 * Dynamically resolves email credentials:
 * 1. process.env (Netlify / container environment)
 * 2. Firestore REST API (settings/email_config document)
 */
async function getEmailConfig(): Promise<EmailConfig> {
  const now = Date.now();
  if (inMemoryConfigCache && now - lastCacheTime < 60000) {
    return inMemoryConfigCache;
  }

  let resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  let brevoApiKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
  let smtpHost = (process.env.SMTP_HOST || "").trim();
  let smtpPort = Number(process.env.SMTP_PORT || 587);
  let smtpUser = (process.env.SMTP_USER || "").trim();
  let smtpPass = (process.env.SMTP_PASS || "").trim();
  let senderEmail = (process.env.NOREPLY_EMAIL || process.env.RESEND_SENDER_EMAIL || "noreply@portalko.net").trim();
  let senderName = (process.env.NOREPLY_NAME || process.env.RESEND_SENDER_NAME || "Portalko.net").trim();

  // If Resend key is not in process.env, query Firestore settings/email_config via REST
  if (!resendApiKey) {
    try {
      const firestoreUrl = "https://firestore.googleapis.com/v1/projects/thinking-asset-2lcf1/databases/ai-studio-portalko-7159d16f-86b5-4482-beb4-819bb59cd9dd/documents/settings/email_config";
      const resp = await fetch(firestoreUrl, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const json = await resp.json();
        const fields = json.fields || {};
        if (fields.resendApiKey?.stringValue) {
          resendApiKey = fields.resendApiKey.stringValue.trim();
        }
        if (fields.brevoApiKey?.stringValue && !brevoApiKey) {
          brevoApiKey = fields.brevoApiKey.stringValue.trim();
        }
        if (fields.resendSenderEmail?.stringValue) {
          senderEmail = fields.resendSenderEmail.stringValue.trim();
        }
        if (fields.resendSenderName?.stringValue) {
          senderName = fields.resendSenderName.stringValue.trim();
        }
        if (fields.smtpHost?.stringValue && !smtpHost) {
          smtpHost = fields.smtpHost.stringValue.trim();
        }
        if (fields.smtpUser?.stringValue && !smtpUser) {
          smtpUser = fields.smtpUser.stringValue.trim();
        }
        if (fields.smtpPass?.stringValue && !smtpPass) {
          smtpPass = fields.smtpPass.stringValue.trim();
        }
      }
    } catch (e: any) {
      console.warn("[EMAIL CONFIG FIRESTORE NOTE]:", e.message);
    }
  }

  if (!smtpHost) {
    smtpHost = "e400.hitrost.net";
    smtpUser = "noreply@portalko.net";
  }

  inMemoryConfigCache = {
    resendApiKey,
    resendSenderEmail: senderEmail,
    resendSenderName: senderName,
    brevoApiKey,
    brevoSenderEmail: senderEmail,
    brevoSenderName: senderName,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
  };
  lastCacheTime = now;
  return inMemoryConfigCache;
}

function generateVerificationEmailHtml({ name, confirmationUrl }: { name: string; confirmationUrl: string }): string {
  const safeName = (name || "").trim() || "Uporabnik";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potrdite svoj račun na Portalko.net</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Portalko.net</h1>
        <p style="margin:0;font-size:13px;opacity:0.9;">Slovenski portal za novice, male oglase in dogodke</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#0f172a;">Pozdravljeni, ${safeName}!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
          Hvala za registracijo na portalu <strong>Portalko.net</strong>. Za dokončanje registracije in aktivacijo vašega uporabniškega računa potrdite svoj e-poštni naslov s klikom na spodnji gumb:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${confirmationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            Potrdi moj račun
          </a>
        </div>
        <p style="margin:24px 0 8px 0;font-size:13px;color:#64748b;">
          Če gumb zgoraj ne deluje, kopirajte naslednjo povezavo neposredno v vaš spletni brskalnik:
        </p>
        <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;color:#64748b;">
          <a href="${confirmationUrl}" style="color:#7c3aed;text-decoration:underline;">${confirmationUrl}</a>
        </div>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;">
          Povezava je veljavna 24 ur. Po potrditvi se boste lahko takoj prijavili in v polnosti uporabljali vse funkcionalnosti portala.
        </p>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid #f1f5f9;background-color:#fafafa;padding:20px 28px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
        <span style="display:inline-block;background-color:#e2e8f0;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:8px;">Samodejno sporočilo • Ne odgovarjajte</span>
        <p style="margin:4px 0;">
          To sporočilo je bilo samodejno poslano iz naslova <strong>noreply@portalko.net</strong>. Če se niste registrirali na Portalko.net, lahko to sporočilo mirno prezrete.
        </p>
        <p style="margin:8px 0 0 0;">
          &copy; ${currentYear} Portalko.net. Vse pravice pridržane.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generatePasswordResetHtml({ name, resetUrl }: { name: string; resetUrl: string }): string {
  const safeName = (name || "").trim() || "Uporabnik";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ponastavitev vašega gesla na Portalko.net</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Portalko.net</h1>
        <p style="margin:0;font-size:13px;opacity:0.9;">Slovenski portal za novice, male oglase in dogodke</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#0f172a;">Pozdravljeni, ${safeName}!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
          Prejeli smo zahtevek za ponastavitev gesla vašega uporabniškega računa na portalu <strong>Portalko.net</strong>. Za nastavitev novega gesla kliknite na spodnji gumb:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            Ponastavi moje geslo
          </a>
        </div>
        <p style="margin:24px 0 8px 0;font-size:13px;color:#64748b;">
          Če gumb zgoraj ne deluje, kopirajte naslednjo povezavo neposredno v vaš spletni brskalnik:
        </p>
        <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;color:#64748b;">
          <a href="${resetUrl}" style="color:#7c3aed;text-decoration:underline;">${resetUrl}</a>
        </div>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;">
          Povezava za ponastavitev je veljavna 24 ur. Če tega zahtevka niste oddali vi, lahko to sporočilo mirno prezrete &ndash; vaše geslo ostaja nespremenjeno.
        </p>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid #f1f5f9;background-color:#fafafa;padding:20px 28px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
        <span style="display:inline-block;background-color:#e2e8f0;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:8px;">Samodejno sporočilo • Ne odgovarjajte</span>
        <p style="margin:4px 0;">
          To sporočilo je bilo poslano iz naslova <strong>noreply@portalko.net</strong> ob zahtevi za ponastavitev gesla.
        </p>
        <p style="margin:8px 0 0 0;">
          &copy; ${currentYear} Portalko.net. Vse pravice pridržane.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const handler: Handler = async (event: HandlerEvent) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Dovoljen je le POST zahtevek." }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const { name, email, token, confirmationUrl, resetUrl } = payload;
    const targetUrl = confirmationUrl || resetUrl;

    if (!email || !token || !targetUrl) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Manjkajo obvezni podatki (email, token ali confirmationUrl/resetUrl)." }),
      };
    }

    const safeName = (name || "").trim() || "Uporabnik";
    const isReset = Boolean(resetUrl && !confirmationUrl);
    const subject = isReset 
      ? "Ponastavitev vašega gesla na Portalko.net" 
      : "Potrdite svoj račun na Portalko.net";

    const emailHtml = isReset
      ? generatePasswordResetHtml({ name: safeName, resetUrl: targetUrl })
      : generateVerificationEmailHtml({ name: safeName, confirmationUrl: targetUrl });

    const plainText = isReset
      ? `Pozdravljeni, ${safeName}!\n\nPrejeli smo zahtevek za ponastavitev gesla na Portalko.net.\nZa nastavitev novega gesla kliknite na povezavo:\n${targetUrl}\n\nPovezava je veljavna 24 ur.\nTo sporočilo je bilo samodejno poslano iz naslova noreply@portalko.net.`
      : `Pozdravljeni, ${safeName}!\n\nHvala za registracijo na Portalko.net.\nZa dokončanje registracije in potrditev vašega računa kliknite na povezavo:\n${targetUrl}\n\nPovezava je veljavna 24 ur.\nTo sporočilo je bilo samodejno poslano iz naslova noreply@portalko.net.`;

    const config = await getEmailConfig();
    const noreplyFrom = `"${config.resendSenderName}" <${config.resendSenderEmail}>`;

    // 1. PRIMARY: Resend API (https://resend.com - modern REST API HTTPS, reliable inbox delivery)
    if (config.resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: noreplyFrom,
            to: [email.trim()],
            subject,
            html: emailHtml,
            text: plainText,
          }),
        });

        if (resendResponse.ok) {
          const resendData = await resendResponse.json().catch(() => ({}));
          const msgId = resendData.id || `resend_${Date.now()}`;
          console.log(`[RESEND EMAIL SENT] Email sent to ${email}, id: ${msgId}`);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              sent: true,
              provider: "resend",
              messageId: msgId,
              confirmationUrl: targetUrl,
              resetUrl: targetUrl,
              message: "Sporočilo iz noreply@portalko.net je bilo uspešno poslano prek Resend API.",
            }),
          };
        } else {
          const errText = await resendResponse.text();
          console.warn("[RESEND ERROR]:", resendResponse.status, errText);
        }
      } catch (resendErr: any) {
        console.warn("[RESEND DISPATCH FAILED]:", resendErr.message);
      }
    }

    // 2. FALLBACK: Brevo API (https://api.brevo.com/v3/smtp/email)
    if (config.brevoApiKey) {
      try {
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": config.brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: config.brevoSenderName, email: config.brevoSenderEmail },
            to: [{ email: email.trim(), name: safeName }],
            subject,
            htmlContent: emailHtml,
            textContent: plainText,
          }),
        });

        if (brevoResponse.ok) {
          const brevoData = await brevoResponse.json().catch(() => ({}));
          const msgId = brevoData.messageId || `brevo_${Date.now()}`;
          console.log(`[BREVO EMAIL SENT] Email sent to ${email}, id: ${msgId}`);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              sent: true,
              provider: "brevo",
              messageId: msgId,
              confirmationUrl: targetUrl,
              resetUrl: targetUrl,
              message: "Sporočilo iz noreply@portalko.net je bilo uspešno poslano prek Brevo API.",
            }),
          };
        } else {
          const errText = await brevoResponse.text();
          console.warn("[BREVO ERROR]:", brevoResponse.status, errText);
        }
      } catch (brevoErr: any) {
        console.warn("[BREVO DISPATCH FAILED]:", brevoErr.message);
      }
    }

    // 3. FALLBACK: Standard SMTP with nodemailer (if host and credentials exist)
    if (config.smtpHost) {
      try {
        const { default: nodemailer } = await import("nodemailer");
        const port = Number(config.smtpPort || 587);
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port,
          secure: port === 465,
          auth: config.smtpUser ? {
            user: config.smtpUser,
            pass: config.smtpPass,
          } : undefined,
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000,
        });

        const info = await transporter.sendMail({
          from: noreplyFrom,
          to: email.trim(),
          subject,
          html: emailHtml,
          text: plainText,
        });

        console.log(`[SMTP EMAIL SENT] Email sent to ${email}, messageId: ${info.messageId}`);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            sent: true,
            provider: "smtp",
            messageId: info.messageId,
            confirmationUrl: targetUrl,
            resetUrl: targetUrl,
            message: "Sporočilo iz noreply@portalko.net je bilo uspešno poslano prek SMTP.",
          }),
        };
      } catch (smtpErr: any) {
        console.warn("[SMTP DISPATCH FAILED]:", smtpErr.message);
      }
    }

    // Safety fallback (simulation flag) if all dispatch attempts failed
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        sent: false,
        simulated: true,
        smtpBlocked: true,
        messageId: `sim_${Date.now()}`,
        confirmationUrl: targetUrl,
        resetUrl: targetUrl,
        message: "Povezava je pripravljena.",
      }),
    };
  } catch (err: any) {
    console.error("Napaka v funkciji send-verification-email:", err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message || "Napaka pri obdelavi potrditvenega sporočila.",
      }),
    };
  }
};
