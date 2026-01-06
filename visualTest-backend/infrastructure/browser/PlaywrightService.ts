import { chromium, Browser, Page } from 'playwright';
import { appConfig } from '../../core/config';
import { logger } from '../../infrastructure/logging/logger';

export interface ScreenshotResult {
  screenshot: string; // Base64
  domSnapshot?: string;
  metadata: {
    url: string;
    viewport: { width: number; height: number };
    timestamp: Date;
    userAgent: string;
  };
}

export class PlaywrightService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: appConfig.playwright.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('Playwright browser initialized');
    } catch (error) {
      logger.error('Failed to initialize Playwright browser:', error);
      throw error;
    }
  }

  async captureScreenshot(
    url: string,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 },
    options: {
      waitConditions?: string[];
      fullPage?: boolean;
      captureDom?: boolean;
      waitTime?: number;
    } = {}
  ): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage({
      viewport,
    });

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: appConfig.playwright.timeout,
      });

      // Wait for custom conditions if specified
      if (options.waitConditions) {
        for (const condition of options.waitConditions) {
          await page.waitForSelector(condition, { timeout: 5000 });
        }
      }

      // Additional wait time before screenshot
      if (options.waitTime) {
        await page.waitForTimeout(options.waitTime);
      }

      // Capture screenshot
      const screenshot = await page.screenshot({
        fullPage: options.fullPage ?? true,
        type: 'png',
      });

      if (!screenshot || screenshot.length === 0) {
        throw new Error('Screenshot capture failed - empty buffer');
      }

      const base64Screenshot = screenshot.toString('base64');
      
      if (!base64Screenshot || base64Screenshot.length === 0) {
        throw new Error('Base64 conversion failed');
      }

      // Capture DOM snapshot if requested
      let domSnapshot: string | undefined;
      if (options.captureDom) {
        domSnapshot = await page.content();
      }

      const userAgent = await page.evaluate(() => navigator.userAgent);

      return {
        screenshot: base64Screenshot,
        domSnapshot,
        metadata: {
          url,
          viewport,
          timestamp: new Date(),
          userAgent,
        },
      };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Playwright browser closed');
    }
  }

  async restart(): Promise<void> {
    await this.close();
    await this.initialize();
  }
}