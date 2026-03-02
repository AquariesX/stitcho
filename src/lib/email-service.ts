import nodemailer from 'nodemailer';

// Email Configuration
// Ensure these environment variables are set in your .env file
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"Stitcho Dashboard" <no-reply@stitcho.com>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured. Email skipping...');
    // In development, we might just log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('--- MOCK EMAIL ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      // console.log(`HTML: ${html}`); // Too verbose
      console.log('------------------');
    }
    return { success: false, error: 'SMTP not configured' };
  }

  console.log('Attempting to send email with settings:', {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    from: EMAIL_FROM
  });

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // detailed logs
    logger: true,
    debug: true
  });

  try {
    console.log('Sending email...');
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAccountCreatedEmail(
  email: string,
  name: string,
  role: 'ADMIN' | 'TAILOR',
  password?: string
) {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : 'http://localhost:3000/login';
  const supportEmail = 'support@stitcho.com';
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Stitcho</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #223943; padding: 40px 0; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; }
    .content { padding: 40px; }
    .welcome-text { font-size: 18px; line-height: 1.6; color: #555555; margin-bottom: 25px; }
    .role-badge { display: inline-block; background-color: #e3f2fd; color: #1565c0; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
    .credentials-box { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; }
    .credential-row { margin-bottom: 15px; }
    .credential-row:last-child { margin-bottom: 0; }
    .label { font-size: 12px; text-transform: uppercase; color: #888888; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 5px; }
    .value { font-size: 16px; font-family: 'Courier New', monospace; color: #223943; font-weight: 700; background: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e0e0e0; display: block; }
    .button-container { text-align: center; margin-top: 35px; }
    .button { background-color: #223943; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s; }
    .button:hover { background-color: #1a2c33; }
    .footer { background-color: #f8f9fa; padding: 25px; text-align: center; font-size: 13px; color: #888888; border-top: 1px solid #eaeaea; }
    .warning { color: #d32f2f; font-size: 13px; margin-top: 15px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Stitcho</h1>
    </div>
    <div class="content">
      <div class="welcome-text">
        Hello <strong>${name}</strong>,<br><br>
        Your account has been successfully created. You have been granted <span class="role-badge">${roleDisplay}</span> access to the Stitcho Dashboard.
      </div>

      <div class="credentials-box">
        <div style="margin-bottom: 15px; border-bottom: 1px solid #eaeaea; padding-bottom: 10px; font-weight: bold; color: #223943;">
          Your Credentials
        </div>
        <div class="credential-row">
          <span class="label">Email Address</span>
          <span class="value">${email}</span>
        </div>
        ${password ? `
        <div class="credential-row">
          <span class="label">Temporary Password</span>
          <span class="value">${password}</span>
        </div>
        ` : ''}
        <div class="warning">
          Please log in and change your password immediately for security purposes.
        </div>
      </div>

      <div class="button-container">
        <a href="${loginUrl}" class="button">Log In to Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Stitcho. All rights reserved.</p>
      <p>This is an automated message. Please do not reply directly to this email.<br>
      For assistance, contact <a href="mailto:${supportEmail}" style="color: #223943;">${supportEmail}</a></p>
    </div>
  </div>
</body>
</html>
    `;

  return sendEmail({
    to: email,
    subject: `Welcome to Stitcho! Your ${roleDisplay} Account Details`,
    html: htmlContent
  });
}
