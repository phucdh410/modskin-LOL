const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const domains = require("./domains");
const ncp = require("copy-paste");
const GET_PASSCODE_URL = "https://traffic-user.net/GET_MA.php";

const name = process.argv[2];
if (!name || !domains[name]) {
  console.error("Please provide a valid name.");
  process.exit(1);
}

const DOMAIN = domains[name];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();

  await page.goto(DOMAIN, {
    waitUntil: "networkidle2",
    ignoreHTTPSErrors: true,
  });

  //#region Get codexn
  const codexn = await page.evaluate(() => {
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      if (script.innerHTML.includes("localStorage.codexn =")) {
        const match = script.innerHTML.match(
          /localStorage\.codexn\s*=\s*['"]([^'"]+)['"]/
        );
        return match ? match[1] : null;
      }
    }
    return null;
  });
  console.log("Value of localStorage.codexn:", codexn);
  //#endregion

  //#region Get post url
  const randomPostHref = await page.evaluate((domain) => {
    for (const anchor of document.querySelectorAll("a")) {
      const href = anchor.href;
      if (href.startsWith(domain) && href.length !== domain.length) {
        return href;
      }
    }
    return null;
  }, DOMAIN);
  console.log("Links containing the specified domain:", randomPostHref);
  //#endregion

  //#region Call api to get passcode
  const res = await axios.post(GET_PASSCODE_URL, null, {
    params: { codexn, url: randomPostHref, loai_traffic: DOMAIN, clk: 1 },
  });

  const $ = cheerio.load(res.data);

  const passcode = $("#layma_me_vuatraffic").text().trim();
  console.log("Extracted 6-digit code:", passcode);
  //#endregion

  //#region Copy to clipboard for quick use
  if (passcode) {
    ncp.copy(passcode);
  }
  //#endregion

  await browser.close();
})();
