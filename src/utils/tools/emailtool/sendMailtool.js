const { DynamicTool } = require("langchain/tools");
const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmailTool = new DynamicTool({
  name: "send_email",
  description:
    "Send email. Input should be JSON string: {email, product, link}",

  func: async (input) => {
    const { email, product, link } = JSON.parse(input);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `AI Agent <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Buy link for ${product}`,
      text: `Here is your purchase link:\n${link}`,
    });

    return "Email sent successfully ✅";
  },
});

module.exports = sendEmailTool;