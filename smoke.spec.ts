import { test, expect } from "@playwright/test";

test("homepage loads and shows featured products", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/./); // has some title, not blank
  // At least one product link should render once /api/products/featured resolves
  await expect(page.locator('a[href^="/products/"]').first()).toBeVisible({
    timeout: 10_000,
  });
});

test("products page loads", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator('a[href^="/products/"]').first()).toBeVisible({
    timeout: 10_000,
  });
});

test("admin login page renders and rejects bad credentials", async ({ page }) => {
  await page.goto("/bb-studio/login");
  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByLabel(/password/i).fill("wrong-password");
  await page.getByRole("button", { name: /log ?in|sign ?in/i }).click();
  // Should stay on the login page / show an error, not navigate to the dashboard
  await expect(page).toHaveURL(/bb-studio\/login/);
});
