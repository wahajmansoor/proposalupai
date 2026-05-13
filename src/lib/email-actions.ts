'use server';

import nodemailer from 'nodemailer';

// These should be in .env. Providing defaults for development/testing if missing.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}&email=${email}`;

  const mailOptions = {
    from: `"Proposal Up AI" <${process.env.EMAIL_SERVER_USER}>`,
    to: email,
    subject: `Verify your email - Proposal Up AI`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Verify your email</h2>
        <p style="color: #555; line-height: 1.6;">
          Thank you for signing up for Proposal Up AI! To start generating winning proposals, please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #0070f3;">${verifyUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          If you didn't create an account with Proposal Up AI, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'Failed to send verification email.' };
  }
}

export async function sendContactEmail({
  to,
  fromName,
  fromEmail,
  subject,
  message,
}: {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
}) {
  const mailOptions = {
    from: `"${fromName}" <${process.env.EMAIL_SERVER_USER}>`,
    replyTo: fromEmail,
    to,
    subject: `New Contact Request: ${subject}`,
    text: `You have a new contact request from ${fromName} (${fromEmail}):\n\n${message}`,
    html: `
      <h3>New Contact Request</h3>
      <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending contact email:', error);
    return { success: false, error: 'Failed to send email. Please check server logs.' };
  }
}

export async function sendAdminNotificationEmail(newUser: { name: string; email: string }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'wahajmansoorcom@gmail.com'; // Fallback admin email

  const mailOptions = {
    from: `"Proposal Up AI System" <${process.env.EMAIL_SERVER_USER}>`,
    to: adminEmail,
    subject: `New User Signup: ${newUser.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>New Account Created</h2>
        <p>A new user has just signed up on Proposal Up AI.</p>
        <p><strong>Name:</strong> ${newUser.name}</p>
        <p><strong>Email:</strong> ${newUser.email}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p style="font-size: 12px; color: #888;">This is an automated notification from the Proposal Up AI system.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false };
  }
}

