import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  console.log('Navigating to http://localhost:3005/report-2026 ...');
  try {
    await page.goto('http://localhost:3005/report-2026', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    console.log('Goto failed:', e.message);
  }
  
  // Wait 3.5 seconds for the preloader to finish
  console.log('Waiting for preloader...');
  await new Promise(r => setTimeout(r, 3500));
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'ROOT NOT FOUND');
  console.log('ROOT HTML LENGTH:', rootHtml.length);
  
  await page.screenshot({ path: 'C:/Users/herek/.gemini/antigravity-ide/brain/7f8f549e-f02c-4457-9c16-e14815cc0551/scratch/screenshot.png' });
  console.log('Screenshot saved!');
  
  await browser.close();
})();
