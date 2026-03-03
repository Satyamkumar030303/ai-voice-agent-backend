import { DynamicTool } from "langchain";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


export default  sendEmail = new DynamicTool({
    name: "send_email",
    description: "useful for when you need to send an email. The input should be a JSON object with the following format: {to: 'recipient_email', subject: 'email_subject', text: 'email_body'}",
    func: async ({email,product,link}) => {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        })
        await transporter.sendMail({
            from: "AI Agent <aakashsharma807632@gmail.com>",
            to: email,
            subject: `Buy link for ${product}`,
            text: `Here is your purchase link:\n${link}`,
        })

        return "email sent succesfully"
    }
})