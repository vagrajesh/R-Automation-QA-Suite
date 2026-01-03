import path from 'path';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class ExcelParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    return /\.(xlsx?|csv)$/i.test(filePath);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const XLSX = (await import('xlsx')).default;
    const workbook = XLSX.readFile(filePath);
    let content = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      content += `Sheet: ${sheetName}\n`;
      content += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
    });

    return {
      title: path.basename(filePath),
      content,
      metadata: { 
        sheets: workbook.SheetNames,
        source: filePath
      },
      type: 'excel'
    };
  }
}