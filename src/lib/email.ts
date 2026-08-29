import { Resend } from 'resend';
import { getSetting } from './settings';

// -----------------------------------------------------------------------------
// Transactional email (Resend)
// -----------------------------------------------------------------------------
// Sends account-verification and password-reset emails. Configuration (API
// key, from address, app URL) comes from /admin/settings first, falling
// back to environment variables - see src/lib/settings.ts. If no API key
// is configured anywhere, we log the link to the console instead of
// throwing, so auth flows still work end-to-end in local dev.

async function getResend(): Promise<Resend | null> {
  const apiKey = await getSetting('resend_api_key');
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function getAppUrl(): Promise<string> {
  return (await getSetting('app_url')) || 'http://localhost:3000';
}

async function getFromAddress(): Promise<string> {
  return (await getSetting('email_from')) || 'DERIV TECH <noreply@derivtech.christech.co.ke>';
}

async function sendEmail(to: string, subject: string, html: string, fallbackLabel: string, fallbackUrl: string) {
  const resend = await getResend();

  if (!resend) {
    // No Resend API key configured (neither in /admin/settings nor
    // RESEND_API_KEY) - don't silently pretend to send. Log the link so
    // local/dev flows are still usable end-to-end.
    console.warn(
      `[email] No Resend API key configured - skipping real send. ${fallbackLabel}: ${fallbackUrl}`
    );
    return { sent: false as const };
  }

  const { error } = await resend.emails.send({
    from: await getFromAddress(),
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
  const appUrl = await getAppUrl();
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

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
  const appUrl = await getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

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
