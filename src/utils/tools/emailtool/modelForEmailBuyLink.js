const productFind = require("./emailProductBuyLink");
const sendEmail = require("./sendMailtool");

async function run() {
  const product = "iphone 14";
  const email = "satyamsaty83@gmail.com";

  const link = await productFind.func(product);

  await sendEmail.func(
    JSON.stringify({
      email,
      product,
      link,
    })
  );

  console.log("✅ Email sent successfully");
}

run();