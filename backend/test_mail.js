import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

async function testMail() {
  console.log('Using credentials:', process.env.MAIL_USERNAME, process.env.MAIL_PASSWORD);
  try {
    const info = await transporter.sendMail({
      from: `"Opportunity Pulse Test" <${process.env.MAIL_USERNAME}>`,
      to: process.env.MAIL_USERNAME, // Send to self
      subject: 'Opportunity Pulse - SMTP Test',
      text: 'This is a test email to verify SMTP credentials.'
    });
    console.log('✅ Test email sent successfully:', info.messageId);
  } catch (err) {
    console.error('❌ Test email failed:', err);
  }
}

testMail();
