import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Derive the expected posting count from the job content collection so this
// assertion stays correct as roles are added or removed.
const jobsDir = fileURLToPath(new URL('../src/content/jobs', import.meta.url));
const expectedRoleCount = readdirSync(jobsDir).filter((f) => f.endsWith('.md')).length;

test.describe('Open roles listing', () => {
    test('shows the roles grid with all postings', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible();

        const grid = page.getByTestId('roles-grid');
        await expect(grid).toBeVisible();
        await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
    });

    test('filters roles immediately by department and location and can be cleared', async ({
        page,
    }) => {
        await page.goto('/');
        const departmentFilter = page.getByTestId('department-filter');
        const locationFilter = page.getByTestId('location-filter');
        const visibleRoleCards = page.locator('[data-testid="role-card"]:visible');

        await departmentFilter.selectOption('Finance');
        await expect(visibleRoleCards).toHaveCount(2);

        await locationFilter.selectOption('Helsinki, Finland');
        await expect(visibleRoleCards).toHaveCount(1);
        await expect(visibleRoleCards.getByRole('heading')).toHaveText(
            'Financial Reconciliation Specialist',
        );

        await locationFilter.selectOption('');
        await expect(visibleRoleCards).toHaveCount(2);

        await departmentFilter.selectOption('');
        await expect(visibleRoleCards).toHaveCount(expectedRoleCount);
    });

    test('shows and clears the no-matching-roles message', async ({ page }) => {
        await page.goto('/');
        const noResults = page.getByTestId('roles-empty-results');

        await page.getByTestId('department-filter').selectOption('Technology');
        await page.getByTestId('location-filter').selectOption('Helsinki, Finland');

        await expect(page.locator('[data-testid="role-card"]:visible')).toHaveCount(0);
        await expect(noResults).toBeVisible();

        await page.getByTestId('department-filter').selectOption('');
        await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
        await expect(noResults).toBeHidden();
    });

    test('links through to a role detail page', async ({ page }) => {
        await page.goto('/');
        const firstCard = page.getByTestId('role-card').first();
        const title = await firstCard.getByTestId('role-title').textContent();
        await firstCard.click();
        await expect(page.getByTestId('role-detail-title')).toHaveText(title!.trim());
        await expect(page.getByTestId('apply-form')).toBeVisible();
    });

    for (const { title, location } of [
        { title: 'Senior Frontend Engineer', location: 'Remote (US & Canada)' },
        { title: 'Financial Analyst', location: 'Woodinville, WA, USA' },
    ]) {
        test(`keeps ${title} location on details, not starter cards`, async ({ page }) => {
            await page.goto('/');
            const card = page.getByTestId('role-card').filter({
                has: page.getByRole('heading', { name: title, exact: true }),
            });

            await expect(card).toBeVisible();
            await expect(card.getByText(location, { exact: true })).toHaveCount(0);
            await card.click();
            await expect(page.getByText(location, { exact: true })).toBeVisible();
        });
    }

    test('has no automatically detectable accessibility violations', async ({ page }) => {
        await page.goto('/');
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});
