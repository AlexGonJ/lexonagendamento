import { chromium } from 'playwright';

async function test() {
  console.log("Launching browser...");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log("Failed default launch, trying msedge channel...");
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  }
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  const title = await page.title();
  console.log("Page title:", title);
  await browser.close();
  console.log("Browser test successful!");
}

test().catch(console.error);
