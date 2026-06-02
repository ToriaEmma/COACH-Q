const TO_EMAIL = 'cakpojulia7@gmail.com';

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
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return res.status(500).json({
      message: 'Configuration e-mail manquante. Ajoutez RESEND_API_KEY et RESEND_FROM_EMAIL dans Vercel.',
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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: TO_EMAIL,
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

  return res.status(200).json({ message: 'Inscription envoyée.' });
};
