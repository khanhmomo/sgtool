import nodemailer from "nodemailer";

/**
 * Welcome email for a new Team Leader account, sent via Gmail SMTP.
 * Requires GMAIL_USER (address) + GMAIL_APP_PASSWORD (app password —
 * myaccount.google.com/apppasswords, needs 2FA on the account).
 * Throws on failure — callers should catch so account creation still succeeds.
 */
export async function sendWelcomeEmail(opts: {
  name: string;
  acronym: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set");

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transport.sendMail({
    from: `"Sportograf TL Tool" <${user}>`,
    to: opts.email,
    subject: "Welcome to Sportograf TL Tool — set up your account",
    text: [
      `Hi ${opts.name},`,
      "",
      "An account has been created for you on the Sportograf TL Tool.",
      "",
      `Email: ${opts.email}`,
      `Acronym: ${opts.acronym}`,
      `Temporary password: ${opts.tempPassword}`,
      "",
      `Sign in at ${opts.loginUrl} — you'll be asked to set your own password on first login.`,
      "",
      "— Sportograf TL Tool",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin-bottom:4px">Welcome to Sportograf TL Tool</h2>
        <p>Hi ${opts.name},</p>
        <p>An account has been created for you.</p>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td><b>${opts.email}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#64748b">Acronym</td><td><b>${opts.acronym}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#64748b">Temporary password</td><td><b>${opts.tempPassword}</b></td></tr>
        </table>
        <p>
          <a href="${opts.loginUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Sign in</a>
        </p>
        <p style="color:#64748b;font-size:13px">You'll be asked to set your own password on first login.</p>
        <p style="color:#94a3b8;font-size:12px">— Sportograf TL Tool</p>
      </div>`,
  });
}
