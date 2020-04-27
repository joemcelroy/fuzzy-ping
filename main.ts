import * as puppeteer from 'puppeteer';
const crypto = require('crypto')
const _ = require('lodash')

const types = [
  'script'
]

const algo = 'sha1'

const domainRegex = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/

async function main() {
  return new Promise(async (resolve, reject) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const scriptSet = [];
    const domainSet = [];
    const resolveDebounce = _.debounce(() => resolve(domainSet), 2000)

    page.on("request", async (request: puppeteer.Request) => {
      const resourceType = request.resourceType()
      const url = request.url()

      if (types.includes(resourceType)) {
        scriptSet[url] = {}
      }

    });

    page.on("response", async (response: puppeteer.Response) => {
      const url = response.url()
      const domainMatch = url.match(domainRegex)
      const domain = domainMatch && domainMatch[0]
      const status = response.status()
      
      if (200 <= status && status < 300 && Object.keys(scriptSet).includes(url) && domain) {
        const text = await response.text();
        const hasum = crypto.createHash(algo);
        hasum.update(text);

        if (!domainSet[domain]) domainSet[domain] = []; 
        domainSet[domain].push({
          url: url,
          hash: hasum.digest("hex")
        })
        resolveDebounce()
      }
    })

    await page.goto("https://www.mrporter.com/en-gb/", {
      waitUntil: ["networkidle2", "load", "domcontentloaded"],
      timeout: 100000,
    });
    await page.close();
    await browser.close();

  })

}
main().then((summary) => {
  console.log(summary)
})