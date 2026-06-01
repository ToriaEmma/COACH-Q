const TO_EMAIL = 'cakpojulia7@gmail.com';
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // nodemailer may not be installed locally; we'll handle absence at runtime
  nodemailer = null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildRows(fields) {
  return Object.entries(fields)
    .map(([key, value]) => {
      const cleanValue = value || 'Non renseigné';
      return `
        <tr>
          <th align="left" style="padding:10px;border:1px solid #ddd;background:#f7f7f7;">${escapeHtml(key)}</th>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(cleanValue)}</td>
        </tr>
      `;
    })
    .join('');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = (process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || '').trim();

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  // Gmail fallback: support GMAIL_USER + GMAIL_PASS (app password)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const toEmail = (process.env.TO_EMAIL || TO_EMAIL).trim();

  // Accept either plain email `user@example.com` or `Name <user@example.com>`
  const simpleEmail = '[^\s@]+@[^\s@]+\\.[^\s@]+';
  const fromPattern = new RegExp(`^(?:${simpleEmail}|.+ <${simpleEmail}>$)`);
  const toPattern = new RegExp(`^${simpleEmail}$`);

  if (fromEmail && !fromPattern.test(fromEmail)) {
    return res.status(500).json({
      message:
        "Adresse d’expédition invalide. Utilisez 'email@domaine.com' ou 'Nom <email@domaine.com>'.",
      detail: { fromEmail },
    });
  }

  if (toEmail && !toPattern.test(toEmail)) {
    return res.status(500).json({
      message: "Adresse de destination invalide. Utilisez le format 'email@domaine.com'.",
      detail: { toEmail },
    });
  }

  const fields = req.body || {};
  const participant = fields['Nom et Prénom du participant'] || 'Participant';

  const html = `
    <h1>Nouvelle inscription Coach Q Camp</h1>
    <p>Une nouvelle demande d'inscription vient d'être envoyée depuis le site.</p>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
      ${buildRows(fields)}
    </table>
  `;

  // If Resend is configured, use it (original behavior)
  if (apiKey && fromEmail) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `Nouvelle inscription Coach Q Camp - ${participant}`,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.json().catch(async () => ({ message: await response.text() }));
      return res.status(502).json({
        message: detail.message || detail.error || "L'e-mail n'a pas pu être envoyé.",
        detail,
      });
    }

    return res.status(200).json({ message: 'Inscription envoyée via Resend.' });
  }

  // Fallback to SMTP via Nodemailer if SMTP vars are provided
  // If explicit SMTP provided, use it. Otherwise, allow Gmail app-password fallback.
  let useSmtp = Boolean(smtpHost && smtpUser && smtpPass && fromEmail);
  let smtpOptions = { host: smtpHost, port: Number(smtpPort || 587), secure: Number(smtpPort) === 465 };

  if (!useSmtp && gmailUser && gmailPass) {
    // configure Gmail SMTP
    smtpOptions = { host: 'smtp.gmail.com', port: 465, secure: true };
    useSmtp = true;
  }

  const finalSmtpUser = smtpUser || gmailUser;
  const finalSmtpPass = smtpPass || gmailPass;

  if (useSmtp && finalSmtpUser && finalSmtpPass && fromEmail) {
    if (!nodemailer) {
      return res.status(500).json({ message: 'Nodemailer non installé. Exécutez `npm install`.' });
    }

    try {
      const transporter = nodemailer.createTransport(Object.assign({}, smtpOptions, {
        auth: {
          user: finalSmtpUser,
          pass: finalSmtpPass,
        },
      }));

      await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: `Nouvelle inscription Coach Q Camp - ${participant}`,
        html,
      });

      return res.status(200).json({ message: 'Inscription envoyée via SMTP.' });
    } catch (error) {
      return res.status(502).json({ message: 'Erreur SMTP lors de l’envoi.', detail: error.message });
    }
  }

  return res.status(500).json({
    message:
      'Configuration e-mail manquante. Configurez RESEND_API_KEY + RESEND_FROM_EMAIL, ou SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et FROM_EMAIL.',
  });
};
