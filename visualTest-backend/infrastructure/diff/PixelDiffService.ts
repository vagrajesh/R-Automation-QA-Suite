import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

export interface PixelDiffResult {
  mismatchPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImage: string; // Base64
  isDifferent: boolean;
}

export class PixelDiffService {
  async compareImages(
    baselineImage: string, // Base64
    currentImage: string,   // Base64
    threshold: number = 0.01,
    maskRegions?: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<PixelDiffResult> {
    try {
      // Convert base64 to buffers with size validation
      const baselineBuffer = Buffer.from(baselineImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const currentBuffer = Buffer.from(currentImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');

      // Validate buffer sizes (max 20MB each)
      if (baselineBuffer.length > 20 * 1024 * 1024 || currentBuffer.length > 20 * 1024 * 1024) {
        throw new Error('Image too large for comparison');
      }

      // Get dimensions first
      const meta1 = await sharp(baselineBuffer).metadata();
      const meta2 = await sharp(currentBuffer).metadata();

      let resizedBaseline = baselineBuffer;
      let resizedCurrent = currentBuffer;
      let width = meta1.width || 0;
      let height = meta1.height || 0;

      // Only resize if dimensions don't match
      if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
        const resizeResult = await this.resizeToMatch(baselineBuffer, currentBuffer);
        resizedBaseline = Buffer.from(resizeResult.resizedBaseline);
        resizedCurrent = Buffer.from(resizeResult.resizedCurrent);
        width = resizeResult.width;
        height = resizeResult.height;
      }

      // Parse PNG images with error handling
      let baselinePng, currentPng;
      try {
        baselinePng = PNG.sync.read(resizedBaseline);
      } catch (error) {
        throw new Error(`Failed to parse baseline PNG: ${error}`);
      }
      
      try {
        currentPng = PNG.sync.read(resizedCurrent);
      } catch (error) {
        throw new Error(`Failed to parse current PNG: ${error}`);
      }

      // Validate PNG data integrity
      if (!baselinePng.data || !currentPng.data || 
          baselinePng.data.length !== currentPng.data.length) {
        throw new Error('PNG data corruption detected');
      }

      // Create side-by-side diff image with header
      const headerHeight = 40;
      const diffWidth = width * 2;
      const diffHeight = height + headerHeight;
      const diffPng = new PNG({ width: diffWidth, height: diffHeight });

      // Fill with white background
      for (let i = 0; i < diffPng.data.length; i += 4) {
        diffPng.data[i] = 255;     // R
        diffPng.data[i + 1] = 255; // G
        diffPng.data[i + 2] = 255; // B
        diffPng.data[i + 3] = 255; // A
      }

      // Add header text areas with titles
      // Left header: "BASELINE IMAGE"
      for (let y = 0; y < headerHeight; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * diffWidth + x) * 4;
          diffPng.data[idx] = 200;     // Light gray
          diffPng.data[idx + 1] = 200;
          diffPng.data[idx + 2] = 200;
          diffPng.data[idx + 3] = 255;
        }
      }

      // Right header: "CURRENT SCREENSHOT"
      for (let y = 0; y < headerHeight; y++) {
        for (let x = width; x < diffWidth; x++) {
          const idx = (y * diffWidth + x) * 4;
          diffPng.data[idx] = 220;     // Lighter gray
          diffPng.data[idx + 1] = 220;
          diffPng.data[idx + 2] = 220;
          diffPng.data[idx + 3] = 255;
        }
      }

      // Add text "BASELINE" on left header (bold 12x16 pixel font)
      const drawText = (text: string, startX: number, startY: number, color: [number, number, number]) => {
        // Bold 12x16 pixel font - larger and bolder
        const letters: { [key: string]: number[][] } = {
          'B': [[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'A': [[0,0,0,1,1,1,1,1,0,0,0,0],[0,0,1,1,0,0,0,0,1,1,0,0],[0,1,1,0,0,0,0,0,0,1,1,0],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'S': [[0,0,1,1,1,1,1,1,1,1,0,0],[0,1,1,0,0,0,0,0,0,1,1,0],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[0,1,1,0,0,0,0,0,0,1,1,0],[0,0,1,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'E': [[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,1,1,1,1,1,1,1,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'L': [[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'I': [[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'N': [[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,1,0,0,0,0,0,0,0,1,1],[1,1,1,1,0,0,0,0,0,0,1,1],[1,1,0,1,1,0,0,0,0,0,1,1],[1,1,0,0,1,1,0,0,0,0,1,1],[1,1,0,0,0,1,1,0,0,0,1,1],[1,1,0,0,0,0,1,1,0,0,1,1],[1,1,0,0,0,0,0,1,1,0,1,1],[1,1,0,0,0,0,0,0,1,1,1,1],[1,1,0,0,0,0,0,0,0,1,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'C': [[0,0,1,1,1,1,1,1,1,1,0,0],[0,1,1,0,0,0,0,0,0,1,1,0],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,1],[0,1,1,0,0,0,0,0,0,1,1,0],[0,0,1,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'U': [[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[0,1,1,0,0,0,0,0,0,1,1,0],[0,0,1,1,1,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'R': [[1,1,1,1,1,1,1,1,1,1,0,0],[1,1,1,1,1,1,1,1,1,1,1,0],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,1,0,0],[1,1,0,0,0,1,1,0,0,0,0,0],[1,1,0,0,0,0,1,1,0,0,0,0],[1,1,0,0,0,0,0,1,1,0,0,0],[1,1,0,0,0,0,0,0,1,1,0,0],[1,1,0,0,0,0,0,0,0,1,1,0],[1,1,0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          'T': [[1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,1,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
          ' ': [[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]]
        };
        
        let currentX = startX;
        for (const char of text) {
          const pattern = letters[char] || letters[' '];
          for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
              if (pattern[row][col] && currentX + col < diffWidth && startY + row < headerHeight) {
                const idx = ((startY + row) * diffWidth + (currentX + col)) * 4;
                diffPng.data[idx] = color[0];
                diffPng.data[idx + 1] = color[1];
                diffPng.data[idx + 2] = color[2];
                diffPng.data[idx + 3] = 255;
              }
            }
          }
          currentX += 14; // Letter width + spacing
        }
      };

      // Draw titles with larger, bold font
      drawText('BASELINE', Math.floor(width / 2) - 56, 8, [0, 0, 0]); // Black text
      drawText('CURRENT', Math.floor(width * 1.5) - 49, 8, [0, 0, 0]); // Black text

      // Add vertical separator line
      for (let y = 0; y < diffHeight; y++) {
        const idx = (y * diffWidth + width) * 4;
        diffPng.data[idx] = 0;       // Black line
        diffPng.data[idx + 1] = 0;
        diffPng.data[idx + 2] = 0;
        diffPng.data[idx + 3] = 255;
      }

      // Copy baseline to left side (below header)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstIdx = ((y + headerHeight) * diffWidth + x) * 4;
          
          diffPng.data[dstIdx] = baselinePng.data[srcIdx];
          diffPng.data[dstIdx + 1] = baselinePng.data[srcIdx + 1];
          diffPng.data[dstIdx + 2] = baselinePng.data[srcIdx + 2];
          diffPng.data[dstIdx + 3] = baselinePng.data[srcIdx + 3];
        }
      }

      // Copy current to right side (below header)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstIdx = ((y + headerHeight) * diffWidth + (x + width)) * 4;
          
          diffPng.data[dstIdx] = currentPng.data[srcIdx];
          diffPng.data[dstIdx + 1] = currentPng.data[srcIdx + 1];
          diffPng.data[dstIdx + 2] = currentPng.data[srcIdx + 2];
          diffPng.data[dstIdx + 3] = currentPng.data[srcIdx + 3];
        }
      }

      // Count different pixels (with masking support)
      let diffPixels = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Check if pixel is in masked region
          const isMasked = maskRegions?.some(region =>
            x >= region.x && x < region.x + region.width &&
            y >= region.y && y < region.y + region.height
          );

          if (isMasked) {
            continue; // Skip masked pixels
          }

          const i = (y * width + x) * 4;
          const r1 = baselinePng.data[i];
          const g1 = baselinePng.data[i + 1];
          const b1 = baselinePng.data[i + 2];
          const r2 = currentPng.data[i];
          const g2 = currentPng.data[i + 1];
          const b2 = currentPng.data[i + 2];

          const delta = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) / (255 * Math.sqrt(3));
          
          if (delta > (threshold / 100)) {
            diffPixels++;
          }
        }
      }

      const totalPixels = width * height;
      const mismatchPercentage = (diffPixels / totalPixels) * 100;

      // Convert diff image to base64
      const diffBuffer = PNG.sync.write(diffPng);
      const diffImage = `data:image/png;base64,${diffBuffer.toString('base64')}`;

      return {
        mismatchPercentage,
        diffPixels,
        totalPixels,
        diffImage,
        isDifferent: mismatchPercentage > threshold,
      };
    } catch (error) {
      throw new Error(`Pixel diff failed: ${error}`);
    }
  }

  private async resizeToMatch(
    image1: Buffer,
    image2: Buffer
  ): Promise<{ resizedBaseline: Buffer; resizedCurrent: Buffer; width: number; height: number }> {
    // Get dimensions
    const meta1 = await sharp(image1).metadata();
    const meta2 = await sharp(image2).metadata();

    // Use larger dimensions
    const width = Math.max(meta1.width || 0, meta2.width || 0);
    const height = Math.max(meta1.height || 0, meta2.height || 0);

    // Resize both images with sharp interpolation
    const resizedBaseline = await sharp(image1)
      .resize(width, height, { 
        fit: 'fill',
        kernel: sharp.kernel.lanczos3
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();

    const resizedCurrent = await sharp(image2)
      .resize(width, height, { 
        fit: 'fill',
        kernel: sharp.kernel.lanczos3
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();

    return { resizedBaseline, resizedCurrent, width, height };
  }
}