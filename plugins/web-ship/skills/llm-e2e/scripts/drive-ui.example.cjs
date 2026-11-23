// Example Playwright driver for an LLM chat app running against fake-anthropic.
// Copy it into your scratch directory and edit the selectors and steps.
//
// Usage: node drive-ui.example.cjs <baseUrl> <screenshotDir>
// Needs the `playwright` package (preinstalled in Claude Code cloud sessions:
// run with NODE_PATH="$(npm root -g)").
const { chromium } = require("playwright");

const [baseUrl = "http://localhost:3000", outDir = "."] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

  await page.goto(baseUrl);
  await page.getByLabel("Message").fill("find it"); // EDIT: your input's accessible name
  await page.keyboard.press("Enter");

  // Prove streaming: sample the assistant text while it arrives. More than a
  // couple of distinct values means tokens rendered incrementally.
  const samples = new Set();
  const start = Date.now();
  while (Date.now() - start < 3000) {
    const text = await page.locator(".message.assistant").last().innerText().catch(() => ""); // EDIT selector
    if (text) samples.add(text);
    await page.waitForTimeout(25);
  }
  console.log("distinct partial renders:", samples.size);

  await page.getByText("Here is what I found.").waitFor({ timeout: 15000 }); // EDIT: final text from your scenario
  await page.screenshot({ path: `${outDir}/final.png`, fullPage: true });

  console.log("console errors:", consoleErrors);
  await browser.close();
  if (consoleErrors.length) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
