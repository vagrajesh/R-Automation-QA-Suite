import { DocumentParser } from './DocumentParser.js';
import { SwaggerDocumentParser } from './SwaggerDocumentParser.js';
import { PdfParser } from './PdfParser.js';
import { ExcelParser } from './ExcelParser.js';
import { WordParser } from './WordParser.js';
import { ConfluenceParser } from './ConfluenceParser.js';
import { TextParser } from './TextParser.js';

export class ParserFactory {
  private parsers: DocumentParser[] = [
    new SwaggerDocumentParser(),
    new PdfParser(),
    new ExcelParser(), 
    new WordParser(),
    new ConfluenceParser(),
    new TextParser()
  ];

  getParser(filePath: string): DocumentParser | null {
    return this.parsers.find(parser => parser.canHandle(filePath)) || null;
  }

  getSupportedFormats(): string[] {
    return [
      'Swagger/OpenAPI (.yaml, .yml, .json)',
      'PDF (.pdf)',
      'Excel (.xlsx, .xls, .csv)',
      'Word (.docx, .doc)',
      'Text (.txt, .md, .json)',
      'Confluence (URLs containing confluence/atlassian)'
    ];
  }
}