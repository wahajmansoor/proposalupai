
'use server';

import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    'SMTP environment variables not fully configured. Email sending will be disabled.'
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  if (!SMTP_HOST) {
    console.log(`Simulating OTP email to ${to}: Your code is ${otp}`);
    return; // Do not send email if not configured
  }

  const mailOptions = {
    from: `"Proposal Up" <${SMTP_USER}>`,
    to: to,
    subject: 'Your One-Time Password for Proposal Up',
    text: `Your login passcode is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Your Login Passcode</h2>
        <p>Here is your one-time password to complete your sign-up:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br>
        <p>Thanks,</p>
        <p>The Proposal Up Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // In a production app, you might want to throw an error or handle it differently
  }
}
