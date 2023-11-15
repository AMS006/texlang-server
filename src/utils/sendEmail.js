const nodemailer = require("nodemailer");

async function sendEmail(email,subject,html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS,
    },
  });
  
const texlangLogoUrl = 'https://firebasestorage.googleapis.com/v0/b/texlang.appspot.com/o/texlangLogo.png?alt=media&token=bd42c6f8-2667-4d3c-8959-bbc1193d40f0';
const megdapLogoUrl = 'https://firebasestorage.googleapis.com/v0/b/texlang.appspot.com/o/megdapLogo.png?alt=media&token=de689abf-005b-4606-ad81-c998ad716ceb';

  let updatedHtml = html  +  
  `<br /> 
  <p>Thank you for using Texlang</p> 
  <img src="${texlangLogoUrl}" /> <br /> 
  <p>(a Language Technology Platform powered by Megdap Innovation Labs Pvt. Ltd.)</p> 
  <img src="${megdapLogoUrl}" /> <br />`
  
  try {
    const options = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject,
      html:updatedHtml,
    };
    await transporter.sendMail(options);
  } catch (error) {
    console.log("Email Error : ", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

module.exports = sendEmail;