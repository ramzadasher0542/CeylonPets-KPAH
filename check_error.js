// c:\Users\USER\Downloads\kandy-vetcare\check_error.js
import puppeteer from 'puppeteer';

async function run() {
  console.log('Launching browser to diagnose white screen...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Users\\USER\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER RUNTIME ERROR]:', err.message, err.stack);
  });

  try {
    console.log('Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Navigation complete.');
  } catch (err) {
    console.error('Navigation failed:', err.message);
  }

  await browser.close();
}

run().catch(console.error);
