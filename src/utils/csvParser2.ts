import Papa from 'papaparse'

export interface CSVParseOptions {
  skipRows?: number
}

export async function parseCSVFile2<T>(file: File, options?: CSVParseOptions): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const skipRows = options?.skipRows || 0

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Remove BOM if present
        return header.replace(/^\uFEFF/, '').trim()
      },
      beforeFirstChunk: (chunk: string) => {
        if (skipRows > 0) {
          const lines = chunk.split(/\r\n|\n/)
          return lines.slice(skipRows).join('\n')
        }
        return chunk
      },
      complete: (results) => {
        console.log(`Parsed CSV file: ${file.name}, rows: ${results.data.length}`)
        resolve(results.data as T[])
      },
      error: (error) => {
        console.error('Error parsing CSV file:', error)
        reject(error)
      }
    })
  })
}
