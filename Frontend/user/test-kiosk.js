import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Forward console logs to our stdout
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

  await page.goto('http://localhost:3000');
  
  // Wait for React to load and display HomeSelection
  await page.waitForSelector('text/Electricity');
  
  // Click the Electricity button
  const electricityBtn = await page.$('text/Electricity');
  if (electricityBtn) await electricityBtn.click();
  
  // Wait for login screen and KioskInput
  await page.waitForSelector('input[data-format="consumer"]');
  
  // Focus the input
  await page.focus('input[data-format="consumer"]');
  
  // We need to use the virtual keyboard, not physical keyboard.
  // The virtual keyboard buttons have text 1, 2, 3, 4, 5.
  // Let's find them.
  const clickVirtualKey = async (key) => {
      // Find the button inside the VirtualKeyboard component
      const btns = await page.$$('button');
      for (const btn of btns) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text.trim() === key.toString()) {
              await btn.click();
              // wait a bit for React to process
              await new Promise(r => setTimeout(r, 200));
              return;
          }
      }
      console.log('Key not found:', key);
  };

  await clickVirtualKey('1');
  await clickVirtualKey('2');
  await clickVirtualKey('3');
  await clickVirtualKey('4');
  await clickVirtualKey('5');
  
  const val = await page.evaluate(() => document.querySelector('input[data-format="consumer"]').value);
  console.log('FINAL INPUT VALUE:', val);

  await browser.close();
})();
