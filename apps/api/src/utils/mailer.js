import nodemailer from "nodemailer";

// ✅ Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail", // for Gmail. Use 'smtp.yourprovider.com' for custom SMTP
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // Gmail app password (not your normal password)
  },
});

/**
 * Send OTP to user's email
 * @param {string} to - recipient email
 * @param {string} otp - OTP code
 */
export async function sendOtpEmail(to, otp) {
  // Local development without SMTP credentials: print the OTP instead of emailing it
  if (process.env.NODE_ENV !== "production" && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
    console.log(`[dev] Email not configured. OTP for ${to}: ${otp}`);
    return;
  }
  const mailOptions = {
    from: `"CognitiaHub" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your CognitiaHub OTP Code",
    html: `
      <div style="font-family:Arial, sans-serif; padding:10px;">
        <h2>Welcome to CognitiaHub 🎉</h2>
        <p>Your one-time password (OTP) is:</p>
        <h1 style="color:#4CAF50;">${otp}</h1>
        <p>This code is valid for <b>10 minutes</b>.</p>
        <p>If you didn’t request this, you can ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Real OTP email sent to: ${to}`);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
    throw new Error("Email sending failed");
  }
}
