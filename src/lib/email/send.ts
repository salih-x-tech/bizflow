import "server-only";
import nodemailer from "nodemailer";

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function createMailer() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const secureValue = process.env.SMTP_SECURE?.trim();

  if (!host || !user || !pass || !from || !portValue) {
    throw new Error("Email configuration is incomplete.");
  }

  if (
    !/^\d+$/.test(portValue) ||
    (secureValue !== "true" && secureValue !== "false")
  ) {
    throw new Error("Email configuration is invalid.");
  }

  const port = Number(portValue);
  const secure = secureValue === "true";

  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP port is invalid.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });

  return {
    transporter,
    from,
  };
}

let cachedMailer: ReturnType<typeof createMailer> | undefined;

function getMailer() {
  if (!cachedMailer) {
    cachedMailer = createMailer();
  }

  return cachedMailer;
}

export async function verifyEmailConnection(): Promise<void> {
  const { transporter } = getMailer();
  await transporter.verify();
}

export async function sendEmail(
  message: EmailMessage,
): Promise<void> {
  const { transporter, from } = getMailer();

  const result = await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  if (result.accepted.length === 0 || result.rejected.length > 0) {
    throw new Error("Email recipient was not accepted.");
  }
}