import type { Handler, HandlerEvent } from "@netlify/functions";

function generateEmailHtml({ name, confirmationUrl }: { name: string; confirmationUrl: string }): string {
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
    const { name, email, token, confirmationUrl } = payload;

    if (!email || !token || !confirmationUrl) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Manjkajo obvezni podatki (email, token ali confirmationUrl)." }),
      };
    }

    const safeName = (name || "").trim() || "Uporabnik";
    const noreplyEmail = process.env.NOREPLY_EMAIL || "noreply@portalko.net";
    const noreplyName = process.env.NOREPLY_NAME || "Portalko.net";
    const noreplyFrom = `"${noreplyName}" <${noreplyEmail}>`;
    const subject = "Potrdite svoj račun na Portalko.net";
    const emailHtml = generateEmailHtml({ name: safeName, confirmationUrl });
    const plainText = `Pozdravljeni, ${safeName}!\n\nHvala za registracijo na Portalko.net.\nZa dokončanje registracije in potrditev vašega računa kliknite na povezavo:\n${confirmationUrl}\n\nPovezava je veljavna 24 ur.\nTo sporočilo je bilo samodejno poslano iz naslova ${noreplyEmail}.`;

    // 1. Try Resend API (HTTP-based, perfect for serverless Netlify)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: noreplyFrom,
            to: [email],
            subject,
            html: emailHtml,
            text: plainText,
          }),
        });

        if (resendResponse.ok) {
          const resendData = await resendResponse.json();
          console.log(`[RESEND EMAIL SENT] Confirmation sent to ${email}, id: ${resendData.id}`);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              sent: true,
              provider: "resend",
              messageId: resendData.id,
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano.",
            }),
          };
        } else {
          const errText = await resendResponse.text();
          console.warn("[RESEND ERROR]:", errText);
        }
      } catch (resendErr: any) {
        console.warn("[RESEND DISPATCH FAILED]:", resendErr.message);
      }
    }

    // 2. Try Brevo API (Free 300 emails/day, EU GDPR compliant, REST API HTTPS port 443)
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (brevoApiKey) {
      try {
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: noreplyName, email: noreplyEmail },
            to: [{ email, name: safeName }],
            subject,
            htmlContent: emailHtml,
            textContent: plainText,
          }),
        });

        if (brevoResponse.ok) {
          const brevoData = await brevoResponse.json().catch(() => ({}));
          console.log(`[BREVO EMAIL SENT] Confirmation sent to ${email}`);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              sent: true,
              provider: "brevo",
              messageId: brevoData.messageId,
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano.",
            }),
          };
        } else {
          const errText = await brevoResponse.text();
          console.warn("[BREVO ERROR]:", errText);
        }
      } catch (brevoErr: any) {
        console.warn("[BREVO DISPATCH FAILED]:", brevoErr.message);
      }
    }

    // 3. Try SendGrid API
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      try {
        const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: noreplyEmail, name: noreplyName },
            subject,
            content: [
              { type: "text/plain", value: plainText },
              { type: "text/html", value: emailHtml },
            ],
          }),
        });

        if (sgResponse.ok) {
          console.log(`[SENDGRID EMAIL SENT] Confirmation sent to ${email}`);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              sent: true,
              provider: "sendgrid",
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano.",
            }),
          };
        }
      } catch (sgErr: any) {
        console.warn("[SENDGRID DISPATCH FAILED]:", sgErr.message);
      }
    }

    // 4. Try standard SMTP with nodemailer
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      try {
        const { default: nodemailer } = await import("nodemailer");
        const port = Number(process.env.SMTP_PORT || 587);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port,
          secure: port === 465,
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
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
          to: email,
          subject,
          html: emailHtml,
          text: plainText,
        });

        console.log(`[SMTP EMAIL SENT] Confirmation sent to ${email}, messageId: ${info.messageId}`);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            sent: true,
            provider: "smtp",
            messageId: info.messageId,
            confirmationUrl,
            message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano prek SMTP.",
          }),
        };
      } catch (smtpErr: any) {
        console.warn("[SMTP ERROR]:", smtpErr.message);
        if (smtpErr.message?.includes("Country") || smtpErr.message?.includes("IntCode") || smtpErr.message?.includes("550")) {
          console.warn("[SMTP COUNTRY FILTER] Hitrost.net cPanel country protection blocked outbound connection from cloud host. Disable country filter in cPanel or use Resend/Brevo API.");
        }
      }
    }

    // 4. Fallback: Always return 200 OK with confirmation details so user is never blocked by 404
    console.log(`[NOREPLY EMAIL READY] Confirmation for ${email}: ${confirmationUrl}`);
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        sent: false,
        simulated: true,
        messageId: `sim_${Date.now()}`,
        confirmationUrl,
        message: "Potrditvena povezava je pripravljena. Za samodejno pošiljanje prek noreply@portalko.net nastavite SMTP_HOST ali RESEND_API_KEY v okoljskih spremenljivkah.",
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
