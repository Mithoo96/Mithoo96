import nodemailer from 'nodemailer';

// Thin SMTP adapter. Credentials come only from server env vars.
export function createMailer(smtp, { transport } = {}) {
  if (!smtp.enabled && !transport) return null;
  const t = transport || nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    disableFileAccess: true, disableUrlAccess: true,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  return {
    async send({ to, subject, text, html, replyTo }) {
      const info = await t.sendMail({ from: smtp.from, to, subject, text, html, replyTo: replyTo || smtp.replyTo || undefined });
      return { messageId: info.messageId, accepted: info.accepted };
    },
    verify: () => t.verify ? t.verify() : Promise.resolve(true),
  };
}
