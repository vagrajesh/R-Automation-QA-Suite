import axios from 'axios';
import * as cheerio from 'cheerio';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class ConfluenceParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    return filePath.includes('confluence') || filePath.includes('atlassian');
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const token = process.env.CONFLUENCE_TOKEN;
    if (!token) {
      throw new Error('CONFLUENCE_TOKEN environment variable required');
    }

    const response = await axios.get(filePath, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const title = response.data.title || 'Confluence Page';
    const htmlContent = response.data.body?.storage?.value || response.data.body;
    const textContent = this.extractTextFromHtml(htmlContent);

    return {
      title,
      content: textContent,
      metadata: { 
        spaceKey: response.data.space?.key,
        pageId: response.data.id,
        source: filePath
      },
      type: 'confluence'
    };
  }

  private extractTextFromHtml(html: string): string {
    const $ = cheerio.load(html);
    return $.text().replace(/\s+/g, ' ').trim();
  }
}