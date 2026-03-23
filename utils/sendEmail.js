const { BrevoClient } = require("@getbrevo/brevo");

const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

exports.sendEmail = async (to, subject, htmlContent) => {
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: "wrldsage@gmail.com", name: "Fony App" },
    to: [{ email: to }],
    subject,
    htmlContent,
  });
};