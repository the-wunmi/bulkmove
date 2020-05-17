const { spawn } = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const config = require("./config.json");

const operations = {
  lookup: `iTMSTransporter -m lookupMetadata -u ${config.appleId} -p ${config.appPassword} -vendor_id ${config.SKU} -destination .`,
  verify: `iTMSTransporter -m verify -u ${config.appleId} -p ${config.appPassword} -f ${config.SKU}.itmsp/`,
  upload: `iTMSTransporter -m upload -u ${config.appleId} -p ${config.appPassword} -f ${config.SKU}.itmsp/`,
  status: `iTMSTransporter -m statusAll -u ${config.appleId} -p ${config.appPassword} -vendor_id ${config.SKU} -outputFormat xml`
};


switch (process.argv.slice(2)[0]) {
  case "lookup": {
    const transporter = spawn("xcrun", [...operations.lookup.split(" "), ...process.argv.slice(2)[1] === "subitemids" ? ["-subitemtype", "InAppPurchase", "-subitemids", config.in_app_purchases.map(product => product.product_id).join()] : []])
    transporter.stdout.pipe(process.stdout)
  }
    break;

  case "verify": {
    const transporter = spawn("xcrun", operations.verify.split(" "))
    transporter.stdout.pipe(process.stdout)
  }
    break;

  case "upload": {
    const transporter = spawn("xcrun", operations.upload.split(" "))
    transporter.stdout.pipe(process.stdout)
  }
    break;

  case "status": {
    const transporter = spawn("xcrun", operations.status.split(" "))
    transporter.stdout.pipe(process.stdout)
  }
    break;

  case "generate":
    (async () => {
      const products = [];
      for (const iap of config.in_app_purchases) {
        const filestat = fs.statSync(`${config.SKU}.itmsp/` + config.assets_dir + iap.review_screenshot)
        const hash = await calculateFileHash(`${config.SKU}.itmsp/` + config.assets_dir + iap.review_screenshot).catch(e => console.error(e))
        products.push(`<in_app_purchase>`
          + `<product_id>${iap.product_id}</product_id>`
          + `<reference_name>${iap.reference_name}</reference_name>`
          + `<type>${iap.type}</type>`
          + `<products>${iap.products.map(product => {
            return `<product><cleared_for_sale>${product.cleared_for_sale}</cleared_for_sale>`
              + `<intervals>${product.intervals.map(interval => `<interval><start_date>${interval.start_date}</start_date><wholesale_price_tier>${interval.wholesale_price_tier}</wholesale_price_tier></interval>`).join("")}</intervals>`
              + `</product>`
          }).join("")}</products>`
          + `<locales>${iap.locales.map(locale => `<locale name="${locale.name}"><title>${locale.title}</title><description>${locale.description}</description></locale>`).join("")}</locales>`
          + `<review_screenshot><size>${filestat.size}</size><file_name>${config.assets_dir}${iap.review_screenshot}</file_name><checksum type="md5">${hash}</checksum></review_screenshot></in_app_purchase>`);
      }
      console.log(products.join(""))
    })()
    break;

  default:
    throw new Error('expecting one of arguments lookup, verify, upload, status, generate')
}

function calculateFileHash(filename) {
  return new Promise((resolve, reject) => {
    let shasum = crypto.createHash('md5');
    try {
      let s = fs.ReadStream(filename)
      s.on('data', data => shasum.update(data))
      s.on('end', () => resolve(shasum.digest('hex')))
    } catch (error) {
      return reject(error);
    }
  });
}