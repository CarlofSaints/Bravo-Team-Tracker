import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bravo-team-tracker.vercel.app';

export async function sendWelcomeEmail({
  to, name, username, password,
}: {
  to: string; name: string; username: string; password: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:#091638;padding:28px 32px;text-align:center;">
            <img src="${SITE_URL}/images/bravo-logo-white.png" alt="Bravo" height="40" style="display:inline-block;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#091638;">Welcome to Bravo Team Tracker</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Hi ${name},<br/><br/>
              Welcome to the Bravo Team Tracker portal. Here are your login credentials:
            </p>
            <table cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;padding:16px 20px;width:100%;margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#888;width:100px;">Username</td>
                <td style="padding:6px 0;font-size:14px;color:#091638;font-weight:600;">${username}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#888;">Password</td>
                <td style="padding:6px 0;font-size:14px;color:#091638;font-weight:600;">${password}</td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.5;">
              You will be asked to change your password on first login.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:#091638;border-radius:8px;padding:12px 28px;">
                  <a href="${SITE_URL}/login" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Log In Now</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #eee;text-align:center;">
            <img src="${SITE_URL}/images/oj-logo.png" alt="OuterJoin" height="24" style="display:inline-block;opacity:0.6;" />
            <p style="margin:8px 0 0;font-size:11px;color:#aaa;">Powered by OuterJoin</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  await getResend().emails.send({
    from: 'Bravo Team Tracker <noreply@outerjoin.co.za>',
    to,
    subject: 'Welcome to Bravo Team Tracker',
    html,
  });
}
