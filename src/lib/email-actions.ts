'use server';

import nodemailer from 'nodemailer';

// These should be in .env. Providing defaults for development/testing if missing.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '465'),
  secure: true, // Port 465 is always secure
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certs (common with some SMTP providers)
    rejectUnauthorized: false
  }
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}&email=${email}`;
  const senderEmail = process.env.EMAIL_SERVER_USER;

  const mailOptions = {
    from: `"Proposal Up AI" <${senderEmail}>`,
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
    console.log(`Attempting to send verification email to: ${email} via ${process.env.EMAIL_SERVER_HOST}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('CRITICAL_EMAIL_ERROR:', error);
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
  const senderEmail = process.env.EMAIL_SERVER_USER;
  const mailOptions = {
    from: `"${fromName}" <${senderEmail}>`,
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
    console.log(`Sending contact email from: ${fromEmail} to: ${to}`);
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('CONTACT_EMAIL_ERROR:', error);
    return { success: false, error: 'Failed to send email. Please check server logs.' };
  }
}

export async function sendAdminNotificationEmail(newUser: { name: string; email: string }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'wahajmansoorcom@gmail.com'; // Fallback admin email
  const senderEmail = process.env.EMAIL_SERVER_USER;

  const mailOptions = {
    from: `"Proposal Up AI System" <${senderEmail}>`,
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
    console.log(`Sending admin notification for user: ${newUser.email}`);
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('ADMIN_NOTIFY_ERROR:', error);
    return { success: false };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.NEXTAUTH_URL}/new-password?token=${token}`;

    const mailOptions = {
        from: `"Proposal Up AI" <${process.env.EMAIL_SERVER_USER}>`,
        to: email,
        subject: "Reset your Password - Proposal Up AI",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your Proposal Up AI account. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #888;">${resetLink}</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`PASSWORD_RESET_EMAIL_SENT: ${email}`);
        return { success: true };
    } catch (error) {
        console.error("PASSWORD_RESET_EMAIL_ERROR:", error);
        return { error: "Failed to send reset email." };
    }
}
