
import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('verify mutation observer debounce and performance', async ({ page }) => {
    const scriptContent = fs.readFileSync('Fork .js', 'utf8');

    // Mock the Torn API and environment
    await page.addInitScript(() => {
        window.localStorage.setItem('tornItems', JSON.stringify({
            '1': { name: 'Plushie', market_value: 500, city_price: 600 }
        }));
    });

    await page.goto('https://www.torn.com/bazaar.php#/manage');

    // Inject the script
    await page.evaluate((content) => {
        const script = document.createElement('script');
        script.textContent = content;
        document.head.appendChild(script);
    }, scriptContent);

    // Create the Bazaar structure
    await page.evaluate(() => {
        document.body.innerHTML = `
            <div id="bazaarRoot">
                <div class="item___jLJcf">
                    <div class="desc___ABC"><b>Plushie</b></div>
                    <div class="price___XYZ"><div class="input-money-group success"><input class="input-money" value="500"></div></div>
                </div>
            </div>
            <div class="sidebar">
                <div class="linksContainer___123">
                    <a href="/messages.php">Messages</a>
                </div>
            </div>
            <div id="news-ticker">News: something happened...</div>
        `;
    });

    // Capture logs
    const logs = [];
    page.on('console', msg => {
        if (msg.text().includes('[Customizable Bazaar filler]')) {
            logs.push(msg.text());
        }
    });

    // Simulate rapid background updates (like news ticker)
    console.log("Simulating rapid updates...");
    for (let i = 0; i < 50; i++) {
        await page.evaluate((i) => {
            const ticker = document.getElementById('news-ticker');
            ticker.textContent = `News Update ${i}`;
            ticker.setAttribute('data-noise', i);
        }, i);
        // Minimal delay to simulate burst
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 10));
    }

    // Wait for debounce
    await new Promise(r => setTimeout(r, 1000));

    // Verify UI still works
    const checkbox = page.locator('.item-toggle');
    await expect(checkbox).toBeVisible();

    // Analyze logs
    const observerExecutions = logs.filter(l => l.includes('DOM Observer Update took'));
    console.log(`Observer fired ${observerExecutions.length} times for 50 noise updates.`);

    // Expect significantly fewer executions than updates (ideally 1 or 2)
    if (observerExecutions.length > 5) {
        throw new Error(`Observer fired too many times: ${observerExecutions.length}`);
    }

    await page.screenshot({ path: 'performance_verification.png' });
});
