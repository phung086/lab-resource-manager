import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: 'playwright-reports',
  reporter: 'list',
});
