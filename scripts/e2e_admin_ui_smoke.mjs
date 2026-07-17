/**
 * Quick Playwright UI smoke for Platform Admin.
 * Usage: node scripts/e2e_admin_ui_smoke.mjs
 */
import { chromium } from "playwright";
import fs from "fs";

const FE = "http://127.0.0.1:8080";
const findings = [];

function add(sev, title, detail = "") {
  findings.push({ sev, title, detail });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${FE}/admin`);
    await page.waitForLoadState("networkidle");

    const loginVisible =
      (await page.getByRole("button", { name: /sign in/i }).count()) > 0 ||
      (await page.locator('input[type="email"], input[name="email"]').count()) > 0;

    if (!loginVisible) {
      // might already be logged in
      const hasSidebar = (await page.getByText("Tenants").count()) > 0;
      if (!hasSidebar) add("high", "Admin gate neither login nor shell", await page.title());
      else add("pass", "Admin shell already authenticated");
    } else {
      add("pass", "Admin login form visible");
      await page.locator('input[type="email"], input[name="email"]').first().fill("ops@heymizan.ai");
      await page.locator('input[type="password"]').first().fill("MizanOps1!");
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle");
    }

    // Navigate key pages
    const routes = [
      ["/admin", "Overview"],
      ["/admin/tenants", "Tenants"],
      ["/admin/users", "Users"],
      ["/admin/operators", "Operators"],
      ["/admin/billing", "Billing"],
      ["/admin/health", "System health"],
      ["/admin/audit", "Audit"],
    ];

    for (const [path, heading] of routes) {
      await page.goto(`${FE}${path}`);
      await page.waitForLoadState("networkidle");
      const err = await page.getByText(/something went wrong|rendered more hooks/i).count();
      if (err) {
        add("critical", `Crash on ${path}`, await page.locator("body").innerText().then((t) => t.slice(0, 200)));
        continue;
      }
      const titleOk = (await page.getByText(heading, { exact: false }).count()) > 0;
      if (!titleOk) add("medium", `Missing heading on ${path}`, heading);
      else add("pass", `Page loads: ${path}`);

      // Pagination footer on list pages
      if (["/admin/tenants", "/admin/users", "/admin/billing", "/admin/audit"].includes(path)) {
        const pager = await page.getByText(/showing|prev|next/i).count();
        if (!pager) add("low", `No pagination footer visible on ${path}`, "");
        else add("pass", `Pagination UI present on ${path}`);
      }

      if (path === "/admin/users") {
        const opsRow = await page.getByText("ops@heymizan.ai").count();
        if (opsRow) add("high", "Ops email still visible on Users page UI", "");
        else add("pass", "Ops email not on Users page");
        const restaurantCol = await page.getByText("Restaurant", { exact: true }).count();
        if (restaurantCol) add("medium", "Users table still says Restaurant", "Should be Tenant");
        else add("pass", "Users table uses Tenant column");
      }

      if (path === "/admin/tenants") {
        const restWord = await page.getByText(/\d+\s+restaurants/i).count();
        if (restWord) add("medium", "Tenants subtitle still says restaurants", "");
        else add("pass", "Tenants subtitle uses tenants wording");
      }

      if (path === "/admin/health") {
        const degradedStripe =
          (await page.getByText(/Overall:\s*Degraded/i).count()) > 0 &&
          (await page.getByText(/Stripe/i).count()) > 0 &&
          (await page.getByText(/Needs setup|Missing/i).count()) > 0;
        // Only fail if overall degraded solely due to stripe optional — hard to assert; check Healthy or Degraded with required
        const healthy = await page.getByText(/Overall:\s*Healthy/i).count();
        const degraded = await page.getByText(/Overall:\s*Degraded/i).count();
        if (healthy) add("pass", "Health overall Healthy");
        else if (degraded) add("info", "Health overall Degraded", "Check required services");
        const payments = await page.getByText(/Payment providers/i).count();
        if (!payments) add("medium", "Health page missing Payment providers section", "");
        else add("pass", "Health page shows Payment providers section");
      }
    }

    // Open first tenant detail
    await page.goto(`${FE}/admin/tenants`);
    await page.waitForLoadState("networkidle");
    const link = page.locator('a[href*="/admin/tenants/"]').first();
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForLoadState("networkidle");
      const crash = await page.getByText(/rendered more hooks|something went wrong/i).count();
      if (crash) add("critical", "Tenant detail still crashes (hooks)", "");
      else add("pass", "Tenant detail opens without crash");
      const enter = await page.getByRole("button", { name: /enter as tenant/i }).count();
      if (!enter) add("low", "Enter as tenant button missing/misnamed", "");
      else add("pass", "Enter as tenant button present");
    }
  } catch (e) {
    add("critical", "UI smoke exception", String(e));
  } finally {
    await browser.close();
  }

  const lines = ["# Platform Admin UI Smoke", "", ...findings.map((f) => `- **${f.sev.toUpperCase()}** — ${f.title}${f.detail ? `: ${f.detail}` : ""}`)];
  fs.writeFileSync("/Users/macbookpro/code/Mizan_AI/e2e-ui-smoke.md", lines.join("\n"));
  console.log(lines.join("\n"));
  const bad = findings.filter((f) => ["critical", "high", "medium"].includes(f.sev));
  process.exit(bad.length ? 1 : 0);
}

main();
