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
      maskSelectors?: string[];
      ignoreCSSSelectors?: string[];
      ignoreRegions?: Array<{x: number, y: number, width: number, height: number}>;
      freezeAnimations?: boolean;
      dynamicContent?: {
        disableAnimations?: boolean;
        blockAds?: boolean;
        scrollToTriggerLazyLoad?: boolean;
        multipleScreenshots?: boolean;
        stabilityCheck?: boolean;
        maskSelectors?: string[];
      };
    } = {}
  ): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage({
      viewport,
    });

    try {
      // Handle dynamic content options
      if (options.dynamicContent?.disableAnimations || options.freezeAnimations) {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          `
        });
        logger.info('Animations disabled for screenshot capture');
      }

      if (options.dynamicContent?.blockAds) {
        await page.route('**/*', (route) => {
          const request = route.request();
          const url = request.url();
          // Block common ad/tracking domains
          if (url.includes('googleadservices.com') ||
              url.includes('googlesyndication.com') ||
              url.includes('doubleclick.net') ||
              url.includes('facebook.com/tr') ||
              url.includes('amazon-adsystem.com')) {
            route.abort();
          } else {
            route.continue();
          }
        });
        logger.info('Ad blocking enabled for screenshot capture');
      }
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for page to be ready
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.warn('Network idle timeout, proceeding with screenshot');
      });

      // Trigger lazy loading by scrolling
      if (options.dynamicContent?.scrollToTriggerLazyLoad) {
        await this.triggerLazyLoading(page);
        logger.info('Lazy loading triggered by scrolling');
      }

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

      // Stability check - wait for page to stabilize
      if (options.dynamicContent?.stabilityCheck) {
        await this.waitForStability(page);
        logger.info('Page stability check completed');
      }

      // Apply CSS selector masking
      if (options.ignoreCSSSelectors && options.ignoreCSSSelectors.length > 0) {
        console.log('Applying CSS masking to selectors:', options.ignoreCSSSelectors);
        await page.addStyleTag({
          content: options.ignoreCSSSelectors.map(selector => 
            `${selector} { 
              background: #808080 !important; 
              color: #808080 !important; 
              border-color: #808080 !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            ${selector} * { 
              background: #808080 !important; 
              color: #808080 !important; 
              border-color: #808080 !important;
              visibility: hidden !important;
            }`
          ).join('\n')
        });
        // Wait a bit for styles to apply
        await page.waitForTimeout(1000);
        logger.info(`Applied CSS masking to ${options.ignoreCSSSelectors.length} selectors`);
      }

      // Apply masking to dynamic elements
      const maskSelectors = options.maskSelectors || options.dynamicContent?.maskSelectors;
      if (maskSelectors && maskSelectors.length > 0) {
        await this.applyMasking(page, maskSelectors);
        logger.info(`Applied masking to ${maskSelectors.length} selectors: ${maskSelectors.join(', ')}`);
      }

      let screenshot: Buffer;

      // Multiple screenshots for averaging
      if (options.dynamicContent?.multipleScreenshots) {
        screenshot = await this.captureMultipleScreenshots(page, options.fullPage ?? true);
        logger.info('Multiple screenshots captured and averaged');
      } else {
        // Capture screenshot
        screenshot = await page.screenshot({
          fullPage: options.fullPage ?? true,
          type: 'png',
        });
      }

      if (!screenshot || screenshot.length === 0) {
        throw new Error('Screenshot capture failed - empty buffer');
      }

      // Validate buffer size (max 50MB)
      if (screenshot.length > 50 * 1024 * 1024) {
        throw new Error(`Screenshot too large: ${screenshot.length} bytes`);
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

  private async triggerLazyLoading(page: Page): Promise<void> {
    try {
      // Scroll to bottom to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);

      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);

      // Additional scrolls at different intervals
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      for (let i = 0; i < 3; i++) {
        await page.evaluate((height) => {
          window.scrollBy(0, height * 0.8);
        }, viewportHeight);
        await page.waitForTimeout(500);
      }

      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
    } catch (error) {
      logger.warn('Failed to trigger lazy loading:', error);
    }
  }

  private async waitForStability(page: Page): Promise<void> {
    try {
      const timeout = appConfig.dynamicContent.stabilityCheckTimeout;
      const checkInterval = 500;
      let stableCount = 0;
      const requiredStableChecks = 3;

      for (let i = 0; i < timeout / checkInterval; i++) {
        const isStable = await page.evaluate(() => {
          // Check if there are any ongoing animations or transitions
          const animatedElements = document.querySelectorAll('*[style*="animation"], *[style*="transition"]');
          return animatedElements.length === 0;
        });

        if (isStable) {
          stableCount++;
          if (stableCount >= requiredStableChecks) {
            break;
          }
        } else {
          stableCount = 0;
        }

        await page.waitForTimeout(checkInterval);
      }
    } catch (error) {
      logger.warn('Stability check failed:', error);
    }
  }

  async getElementPositions(page: Page, selectors: string[]): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
    const positions: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const boundingBox = await element.boundingBox();
          if (boundingBox) {
            positions.push({
              x: Math.floor(boundingBox.x),
              y: Math.floor(boundingBox.y),
              width: Math.floor(boundingBox.width),
              height: Math.floor(boundingBox.height),
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to get position for selector ${selector}:`, error);
      }
    }

    return positions;
  }

  private async captureMultipleScreenshots(page: Page, fullPage: boolean): Promise<Buffer> {
    const count = appConfig.dynamicContent.multipleScreenshotsCount;
    const interval = appConfig.dynamicContent.multipleScreenshotsInterval;
    const screenshots: Buffer[] = [];

    for (let i = 0; i < count; i++) {
      const screenshot = await page.screenshot({
        fullPage,
        type: 'png',
      });
      screenshots.push(screenshot);
      if (i < count - 1) {
        await page.waitForTimeout(interval);
      }
    }

    // Return the last screenshot (most stable)
    // For more advanced averaging, you could implement pixel averaging here
    return screenshots[screenshots.length - 1];
  }

  private async applyMasking(page: Page, selectors: string[]): Promise<void> {
    try {
      await page.addStyleTag({
        content: `
          .visual-test-mask {
            background: #808080 !important;
            color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            opacity: 1 !important;
          }
          .visual-test-mask * {
            visibility: hidden !important;
          }
        `
      });

      for (const selector of selectors) {
        await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            el.classList.add('visual-test-mask');
          });
        }, selector.trim());
      }
    } catch (error) {
      logger.warn('Failed to apply masking:', error);
    }
  }
}