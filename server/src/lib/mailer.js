import nodemailer from 'nodemailer';

export function createMailer(smtp, logger = console) {
  const enabled = Boolean(smtp?.host && smtp.user && smtp.pass && smtp.to);
  const transport = enabled
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      })
    : null;

  return {
    enabled,
    // Never throws: the message is already stored, so email is strictly best-effort.
    async sendContactNotification(message) {
      if (!transport) return false;
      try {
        await transport.sendMail({
          from: `"Portfolio contact" <${smtp.user}>`,
          to: smtp.to,
          replyTo: `"${message.name.replace(/["\r\n]/g, '')}" <${message.email}>`,
          subject: `[Portfolio] ${message.subject || 'New message'}`.replace(/[\r\n]/g, ' '),
          text: `From: ${message.name} <${message.email}>\n\n${message.body}`,
        });
        return true;
      } catch (err) {
        logger.error('[mailer] failed to send contact notification:', err.message);
        return false;
      }
    },
  };
}
