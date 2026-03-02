
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(__dirname, '.env') });

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"Stitcho Test" <no-reply@stitcho.com>';

console.log('--- Email Configuration Test ---');
console.log(`SMTP_HOST: ${SMTP_HOST}`);
console.log(`SMTP_PORT: ${SMTP_PORT}`);
console.log(`SMTP_USER: ${SMTP_USER}`);
console.log(`SMTP_PASS: ${SMTP_PASS ? '********' : 'NOT SET'}`);
console.log('--------------------------------');

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('Missing required environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    logger: true,
    debug: true
});

async function sendTestEmail() {
    try {
        console.log(`Attempting to send test email to: ${SMTP_USER}`);
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: SMTP_USER, // Send to self for testing
            subject: 'Stitcho SMTP Test',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<p>This is a <b>test email</b> to verify SMTP configuration.</p>',
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.error('❌ Failed to send email:');
        console.error(error);
    }
}

sendTestEmail();
