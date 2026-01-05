import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'test_cases_db'
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'test_cases'
const BM25_INDEX_NAME = process.env.BM25_INDEX_NAME || 'bm25_search'
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'vector_index_test_cases'
const VECTOR_DIMENSIONS = parseInt(process.env.MISTRAL_EMBEDDING_DIMENSIONS || '1024', 10)

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment')
    process.exit(1)
  }

  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db = client.db(MONGODB_DB)
    const coll = db.collection(COLLECTION_NAME)

    console.log(`Creating BM25 text index on ${COLLECTION_NAME} (name=${BM25_INDEX_NAME})`)
    try {
      await coll.createIndex(
        {
          id: 'text',
          title: 'text',
          description: 'text',
          module: 'text',
          type: 'text',
          expectedResults: 'text',
          steps: 'text',
          preRequisites: 'text'
        },
        {
          name: BM25_INDEX_NAME,
          weights: {
            id: 10,
            title: 5,
            module: 3,
            description: 2,
            expectedResults: 2,
            steps: 1,
            preRequisites: 1
          }
        }
      )
      console.log('BM25 index created or already exists')
    } catch (err) {
      console.error('Failed to create BM25 index', err)
    }

    console.log(`Attempting to create Vector index (Atlas Vector Search) named: ${VECTOR_INDEX_NAME}`)
    try {
      // Atlas Vector Search index creation often requires Atlas API or UI.
      // The following attempts a createIndex call with cosmosSearch options —
      // if your driver/environment doesn't support it, please use Atlas UI/API.
      // This will succeed on MongoDB servers that support the 'cosmosSearch' index spec.
      await coll.createIndex(
        { embedding: 'cosmosSearch' as any },
        {
          name: VECTOR_INDEX_NAME,
          cosmosSearchOptions: {
            kind: 'vector-ivf',
            similarity: 'COS',
            dimensions: VECTOR_DIMENSIONS
          }
        } as any
      )
      console.log('Vector index create attempted (may require Atlas UI/API verification)')
    } catch (err) {
      console.error('Vector index creation attempt failed. For Atlas, create the index via Atlas UI or the Search Index API.', err)
    }

    console.log('Index creation script completed')
  } finally {
    await client.close()
  }
}

main().catch((e) => {
  console.error('Index creation script failed', e)
  process.exit(1)
})
