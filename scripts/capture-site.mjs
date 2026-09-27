import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/utilisateur/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core");

const output = new URL("../tmp/qa/", import.meta.url);
const baseUrl = process.env.SITE_URL || "http://localhost:3000";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });

for (const [path, filename] of [["/", "home.png"], ["/personnaliser", "personnaliser.png"], ["/collections/amour", "collection-amour.png"]]) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL(filename, output)), fullPage: true });
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.locator(".creation-card").first().hover();
await page.waitForTimeout(1500);
await page.screenshot({ path: fileURLToPath(new URL("home-hover.png", output)), fullPage: false });

await page.goto(`${baseUrl}/personnaliser`, { waitUntil: "networkidle" });
await page.locator(".wrap-card").nth(1).click();
await page.locator(".flower-card").first().locator(".quantity-control button").last().click();
await page.locator(".extra-card .outline-button").first().click();
await page.reload();
const persisted = {
  goldSelected: await page.getByRole("button", { name: "Kraft doré" }).getAttribute("aria-pressed"),
  roseQuantity: await page.locator(".flower-card").first().locator(".quantity-control span").textContent(),
  firstExtraSelected: await page.locator(".extra-card .outline-button").first().textContent(),
};
if (persisted.goldSelected !== "true" || persisted.roseQuantity !== "2" || !persisted.firstExtraSelected?.includes("RETIRER")) {
  throw new Error(`Cart persistence check failed: ${JSON.stringify(persisted)}`);
}
console.log(JSON.stringify(persisted));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/personnaliser`, { waitUntil: "networkidle" });
await page.screenshot({ path: fileURLToPath(new URL("mobile.png", output)), fullPage: true });
await browser.close();
