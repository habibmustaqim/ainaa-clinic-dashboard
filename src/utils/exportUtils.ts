import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn {
  header: string
  accessor: string | ((row: any) => any)
  width?: number
  type?: 'date' | 'number' | 'currency' | 'text' // Column data type for formatting
}

export interface ExportOptions {
  filename: string
  title?: string
  columns: ExportColumn[]
  data: any[]
}

/**
 * Calculate percentile value from an array of numbers
 */
const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Calculate optimal column width based on content using percentile analysis
 * Samples first 100 rows for performance
 * Uses average of header and 90th percentile data to balance wrapping
 */
const calculateOptimalWidth = (
  column: ExportColumn,
  data: any[],
  format: 'pdf' | 'excel' = 'pdf'
): number => {
  // If width is already specified, use it
  if (column.width) return column.width

  // Sample size for calculation
  const sampleSize = Math.min(100, data.length)
  const sampleData = data.slice(0, sampleSize)

  // Get all values for this column
  const values = sampleData.map(row => {
    const value = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor]
    return value !== null && value !== undefined ? String(value) : ''
  })

  // Calculate length statistics
  const lengths = values.map(v => v.length)
  const headerLength = column.header.length

  // Use 90th percentile of data lengths to avoid over-sizing for outliers
  const p90DataLength = calculatePercentile(lengths, 90)
  const maxDataLength = Math.max(...lengths, 0)

  // For dates and numbers: fit to content (use max of header or data)
  // For text: use average to allow wrapping (except phone numbers)
  const isDateOrNumber = column.type === 'date' || column.type === 'number' || column.type === 'currency'
  const isPhoneColumn = column.header.toLowerCase().includes('phone') ||
                        column.header.toLowerCase().includes('contact') ||
                        column.header.toLowerCase().includes('tel')

  let baseLength: number
  if (column.type === 'date') {
    // Dates: always use data length (dates are predictable width: DD-MM-YYYY = 10 chars)
    // Let headers wrap if needed via willDrawCell hook
    baseLength = maxDataLength
  } else if (isDateOrNumber || isPhoneColumn) {
    // Numbers/currency/phones: use whichever is wider (header or data)
    baseLength = Math.max(headerLength, maxDataLength)
  } else {
    // Text: average header and 90th percentile data to allow wrapping
    baseLength = Math.ceil((headerLength + p90DataLength) / 2)
  }

  // Apply format-specific multipliers and constraints
  if (format === 'pdf') {
    // PDF: Character to mm conversion (approximate)
    const baseWidth = baseLength * 2.0

    // Apply type-specific constraints based on actual data patterns
    switch (column.type) {
      case 'date':
        // Dates are predictable (DD-MM-YYYY = 10 chars) - fixed at 20mm
        return 20
      case 'number':
        // Numbers are typically short, size based on actual range
        const maxNumWidth = maxDataLength * 2.0 + 4 // Add padding
        return Math.max(12, Math.min(baseWidth, Math.min(maxNumWidth, 20)))
      case 'currency':
        // Currency format: RM X,XXX.XX (adaptive based on amounts)
        const maxCurrWidth = maxDataLength * 2.0 + 4
        return Math.max(20, Math.min(baseWidth, Math.min(maxCurrWidth, 30)))
      default:
        // Text: more generous max, wrapping enabled
        return Math.max(15, Math.min(baseWidth, 55))
    }
  } else {
    // Excel: Character width units
    const baseWidth = baseLength * 1.1

    switch (column.type) {
      case 'date':
        return Math.max(12, Math.min(baseWidth, 14))
      case 'number':
        const maxNumWidth = maxDataLength * 1.1 + 2
        return Math.max(9, Math.min(baseWidth, Math.min(maxNumWidth, 13)))
      case 'currency':
        const maxCurrWidth = maxDataLength * 1.1 + 2
        return Math.max(12, Math.min(baseWidth, Math.min(maxCurrWidth, 18)))
      default:
        return Math.max(10, Math.min(baseWidth, 40))
    }
  }
}

/**
 * Export data to CSV format
 */
export const exportToCSV = ({ filename, columns, data }: ExportOptions) => {
  try {
    // Prepare data for CSV
    const csvData = data.map(row => {
      const csvRow: any = {}
      columns.forEach(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]
        csvRow[col.header] = value ?? ''
      })
      return csvRow
    })

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(csvData)

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    // Export
    XLSX.writeFile(workbook, `${filename}.csv`)
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    throw new Error('Failed to export CSV')
  }
}

/**
 * Export data to Excel format
 */
export const exportToExcel = ({ filename, columns, data, title }: ExportOptions) => {
  try {
    // Prepare data for Excel
    const excelData = data.map(row => {
      const excelRow: any = {}
      columns.forEach(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]
        excelRow[col.header] = value ?? ''
      })
      return excelRow
    })

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths - calculate if not specified
    const columnWidths = columns.map(col => ({
      wch: calculateOptimalWidth(col, data, 'excel')
    }))
    worksheet['!cols'] = columnWidths

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, title || 'Report')

    // Export
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('Failed to export Excel')
  }
}

/**
 * Export data to PDF format
 */
export const exportToPDF = ({ filename, columns, data, title }: ExportOptions) => {
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: columns.length > 6 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Prepare table headers
    const headers = columns.map(col => col.header)

    // Prepare table body
    const body = data.map(row => {
      return columns.map(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]
        return value !== null && value !== undefined ? String(value) : ''
      })
    })

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 10, // Start near top without title
      tableWidth: doc.internal.pageSize.getWidth() - 12,
      styles: {
        fontSize: 7, // Reduced from 8 to 7 to fit more content
        cellPadding: 1.2, // Reduced from 1.5 to 1.2 for more compact layout
        overflow: 'linebreak',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        valign: 'middle', // Center all data vertically in cells
      },
      headStyles: {
        fillColor: [47, 64, 119], // Primary color from theme
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center', // Changed from 'left' to 'center'
        valign: 'middle', // Center vertically as well
        fontSize: 7, // Reduced from 8 to 7
        cellPadding: 1.2,
        overflow: 'linebreak', // Allow headers to wrap by word
        minCellHeight: 8, // Minimum header height
      },
      // Hook to enable smart word wrapping for header cells
      willDrawCell: (data: any) => {
        // Header word wrapping
        if (data.section === 'head' && data.cell.raw) {
          const text = String(data.cell.raw)

          // Only split long headers with spaces (e.g., "Total Services", "Days Since Visit")
          if (text.includes(' ') && text.length > 12) {
            // Split at the first space to create 2 lines maximum
            const firstSpaceIndex = text.indexOf(' ')
            if (firstSpaceIndex > 0) {
              data.cell.text = [
                text.substring(0, firstSpaceIndex),
                text.substring(firstSpaceIndex + 1)
              ]
            }
          }
        }
      },
      // Hook to add colors to Status/Rank columns (didParseCell ensures proper style priority)
      didParseCell: (data: any) => {
        // Color coding for Status and Rank columns
        if (data.section === 'body' && data.cell.raw) {
          const cellValue = String(data.cell.raw)
          const columnHeader = columns[data.column.index]?.header

          // Status colors
          if (columnHeader === 'Status') {
            switch (cellValue) {
              case 'Active':
                data.cell.styles.fillColor = [220, 252, 231] // green-100
                data.cell.styles.textColor = [22, 101, 52] // green-800
                break
              case 'At Risk':
                data.cell.styles.fillColor = [254, 249, 195] // yellow-100
                data.cell.styles.textColor = [133, 77, 14] // yellow-800
                break
              case 'Dormant':
                data.cell.styles.fillColor = [254, 226, 226] // red-100
                data.cell.styles.textColor = [153, 27, 27] // red-800
                break
              case 'New':
                data.cell.styles.fillColor = [219, 234, 254] // blue-100
                data.cell.styles.textColor = [30, 64, 175] // blue-800
                break
            }
          }

          // Rank colors
          if (columnHeader === 'Rank') {
            switch (cellValue) {
              case 'PLATINUM':
                data.cell.styles.fillColor = [239, 246, 255] // blue-50
                data.cell.styles.textColor = [29, 78, 216] // blue-700
                break
              case 'GOLD':
                data.cell.styles.fillColor = [254, 252, 232] // yellow-50
                data.cell.styles.textColor = [161, 98, 7] // yellow-700
                break
              case 'SILVER':
                data.cell.styles.fillColor = [249, 250, 251] // gray-50
                data.cell.styles.textColor = [55, 65, 81] // gray-700
                break
              case 'BRONZE':
                data.cell.styles.fillColor = [255, 251, 235] // amber-50
                data.cell.styles.textColor = [180, 83, 9] // amber-700
                break
              case 'STARTER':
                data.cell.styles.fillColor = [240, 253, 244] // green-50
                data.cell.styles.textColor = [21, 128, 61] // green-700
                break
              case 'CONSULTATION':
                data.cell.styles.fillColor = [248, 250, 252] // slate-50
                data.cell.styles.textColor = [71, 85, 105] // slate-600
                break
            }
          }
        }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245] // Light gray for alternate rows
      },
      margin: { top: 10, right: 6, bottom: 15, left: 6 }, // Increased bottom margin to prevent overlap with footer
      theme: 'grid',
      columnStyles: columns.reduce((acc, col, index) => {
        // Determine cell width and alignment based on column type
        const isDateOrNumber = col.type === 'date' || col.type === 'number' || col.type === 'currency'
        const isPhoneColumn = col.header.toLowerCase().includes('phone') ||
                             col.header.toLowerCase().includes('contact') ||
                             col.header.toLowerCase().includes('tel')

        // Calculate optimal width for all columns
        const optimalWidth = calculateOptimalWidth(col, data, 'pdf')

        acc[index] = {
          // Use calculated width for all column types
          cellWidth: optimalWidth,
          // Right-align dates, numbers, and currency
          halign: isDateOrNumber ? 'right' : 'left',
          // Prevent wrapping for phones, dates, numbers; allow for text
          overflow: (isDateOrNumber || isPhoneColumn) ? 'hidden' : 'linebreak',
          // Minimum cell height to maintain readability
          minCellHeight: 6
        }

        return acc
      }, {} as any)
    })

    // Add footer with filename (left), page numbers (center), and timestamp (right)
    const pageCount = (doc as any).internal.getNumberOfPages()

    // Generate timestamp once (DD-MM-YYYY HH:mm:ss format)
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const dateStr = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const footerY = pageHeight - 8

      // Left: Filename
      doc.text(
        filename,
        6,
        footerY,
        { align: 'left' }
      )

      // Center: Page numbers
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      )

      // Right: Timestamp
      doc.text(
        `Generated: ${dateStr}`,
        pageWidth - 6,
        footerY,
        { align: 'right' }
      )
    }

    // Save PDF
    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export PDF')
  }
}

/**
 * Export data in the specified format
 */
export const exportData = (format: 'csv' | 'excel' | 'pdf', options: ExportOptions) => {
  switch (format) {
    case 'csv':
      return exportToCSV(options)
    case 'excel':
      return exportToExcel(options)
    case 'pdf':
      return exportToPDF(options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}
