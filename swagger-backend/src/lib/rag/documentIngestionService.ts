import { DocumentDeduplicator } from './deduplicator.js';
import vectorStore from './vectorStore.js';
import crypto from 'crypto';
import { ParserFactory } from '../parsers/ParserFactory.js';

export class DocumentIngestionService {
  private deduplicator: DocumentDeduplicator;

  constructor() {
    this.deduplicator = new DocumentDeduplicator();
  }

  async parseDocument(documentPath: string) {
    const parserFactory = new ParserFactory();
    const parser = parserFactory.getParser(documentPath);
    
    if (parser) {
      const parsedDoc = await parser.parse(documentPath);
      return {
        content: parsedDoc.content,
        metadata: {
          title: parsedDoc.title,
          source: documentPath,
          type: parsedDoc.type,
          ...parsedDoc.metadata
        }
      };
    } else {
      // Fallback: handle URLs by fetching content, or files by reading
      const isUrl = documentPath.startsWith('http://') || documentPath.startsWith('https://');
      
      if (isUrl) {
        // For URLs, try to fetch the content
        try {
          const axios = (await import('axios')).default;
          const response = await axios.get(documentPath);
          const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
          
          return {
            content,
            metadata: {
              title: `URL Document: ${documentPath}`,
              source: documentPath
            }
          };
        } catch (error) {
          throw new Error(`Failed to fetch URL: ${documentPath}`);
        }
      } else {
        // For files, read as text
        const fs = await import('fs');
        let actualContent;
        try {
          actualContent = fs.default.readFileSync(documentPath, 'utf8');
        } catch (error) {
          actualContent = `Document content from ${documentPath}`;
        }
        
        return {
          content: actualContent,
          metadata: {
            title: `Document: ${documentPath.split(/[\\/]/).pop()}`,
            source: documentPath
          }
        };
      }
    }
  }

  async ingestWithDeduplication(documents: any[]) {
    // Step 1: Generate content hashes
    const documentsWithHashes = documents.map(doc => {
      const hash = this.generateContentHash(doc.content);
      console.log(`Generated hash for "${doc.title}": ${hash}`);
      return {
        ...doc,
        contentHash: hash,
        metadata: {
          ...doc.metadata,
          ingestedAt: new Date().toISOString()
        }
      };
    });

    // Step 2: Check for existing documents
    const existingHashes = await this.getExistingHashes(
      documentsWithHashes.map(d => d.contentHash)
    );

    // Step 3: Filter duplicates
    const newDocuments = documentsWithHashes.filter(
      doc => !existingHashes.has(doc.contentHash)
    );

    if (newDocuments.length === 0) {
      return {
        success: true,
        message: 'All documents already exist',
        duplicatesFiltered: documents.length,
        newDocuments: 0
      };
    }

    // Step 4: Content deduplication
    const deduplicationResult = this.deduplicator.deduplicate(
      newDocuments.map(doc => ({
        pageContent: doc.content,
        metadata: doc.metadata
      }))
    );

    // Step 5: Store in database
    const finalDocuments = deduplicationResult.uniqueDocuments.map(doc => ({
      type: 'endpoint' as const,
      title: doc.metadata.title || 'Untitled',
      content: doc.pageContent,
      endpoint: '',
      method: 'GET',
      tags: [],
      contentHash: this.generateContentHash(doc.pageContent),
      metadata: doc.metadata
    }));

    await vectorStore.addDocuments(finalDocuments);

    return {
      success: true,
      message: 'Documents ingested with deduplication',
      totalSubmitted: documents.length,
      duplicatesFiltered: documents.length - newDocuments.length,
      similarContentMerged: deduplicationResult.duplicatesRemoved,
      newDocuments: finalDocuments.length
    };
  }

  private generateContentHash(content: string): string {
    return crypto.createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  private async getExistingHashes(hashes: string[]): Promise<Set<string>> {
    try {
      const existingDocs = await vectorStore.findByQuery(
        { contentHash: { $in: hashes } },
        hashes.length
      );
      console.log(`Checking ${hashes.length} hashes, found ${existingDocs.length} existing docs`);
      const existingHashes = new Set(existingDocs.map(doc => doc.contentHash).filter((hash): hash is string => Boolean(hash)));
      console.log('Existing hashes:', Array.from(existingHashes));
      return existingHashes;
    } catch (error) {
      console.error('Error checking existing hashes:', error);
      return new Set();
    }
  }
}