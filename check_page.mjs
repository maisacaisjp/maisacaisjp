import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to http://localhost:3002/...');
  try {
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log('Goto failed:', e.message);
  }
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'ROOT NOT FOUND');
  console.log('ROOT HTML:', rootHtml);
  if (rootHtml.trim().length === 0) {
    console.log('ROOT IS EMPTY!');
  }
  
  await browser.close();
})();
