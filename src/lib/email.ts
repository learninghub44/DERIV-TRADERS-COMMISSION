import { Resend } from 'resend';

// -----------------------------------------------------------------------------
// Transactional email (Resend)
// -----------------------------------------------------------------------------
// Sends account-verification and password-reset emails. If RESEND_API_KEY is
// not configured (e.g. local dev without a key), we log the link to the
// console instead of throwing, so auth flows still work end-to-end locally.

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'DERIV TECH <onboarding@resend.dev>';
}

async function sendEmail(to: string, subject: string, html: string, fallbackLabel: string, fallbackUrl: string) {
  const resend = getResend();

  if (!resend) {
    // No RESEND_API_KEY configured - don't silently pretend to send.
    // Log the link so local/dev flows are still usable end-to-end.
    console.warn(
      `[email] RESEND_API_KEY not set - skipping real send. ${fallbackLabel}: ${fallbackUrl}`
    );
    return { sent: false as const };
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[email] Resend send failed:', error);
    return { sent: false as const, error };
  }

  return { sent: true as const };
}

export async function sendVerificationEmail(to: string, fullName: string, token: string) {
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to DERIV TECH, ${escapeHtml(fullName)}</h2>
      <p>Confirm your email address to activate your account.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">
          Verify email
        </a>
      </p>
      <p>Or paste this link into your browser:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
  `;

  return sendEmail(to, 'Verify your DERIV TECH account', html, 'Verification link', verifyUrl);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>We received a request to reset your DERIV TECH password. This link expires in 1 hour.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">
          Reset password
        </a>
      </p>
      <p>Or paste this link into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail(to, 'Reset your DERIV TECH password', html, 'Reset link', resetUrl);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
