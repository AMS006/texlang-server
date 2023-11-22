const nodemailer = require("nodemailer");

const sendInvoiceEmail = async (to, subject, text, attachment) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS,
    },
  });

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to,
    subject,
    text,
    attachments: [
      {
        filename: "invoice.pdf",
        content: attachment,
        encoding: "base64",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendInvoiceEmail;
