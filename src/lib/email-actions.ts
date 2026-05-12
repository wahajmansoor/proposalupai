'use server';

import nodemailer from 'nodemailer';

// These should be in .env. Providing defaults for development/testing if missing.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

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
