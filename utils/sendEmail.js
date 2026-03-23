const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];

apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

exports.sendEmail = async (to, subject, htmlContent) => {
  await tranEmailApi.sendTransacEmail({
    sender: { email: "wrldsage@gmail.com", name: "Fony App" },
    to: [{ email: to }],
    subject,
    htmlContent,
  });
};
