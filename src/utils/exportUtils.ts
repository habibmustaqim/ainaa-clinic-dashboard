import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn {
  header: string
  accessor: string | ((row: any) => any)
  width?: number
}

export interface ExportOptions {
  filename: string
  title?: string
  columns: ExportColumn[]
  data: any[]
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

    // Set column widths
    const columnWidths = columns.map(col => ({
      wch: col.width || 15
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

    // Add title
    if (title) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 14, 15)
    }

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
      startY: title ? 25 : 15,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [47, 64, 119], // Primary color from theme
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245] // Light gray for alternate rows
      },
      margin: { top: 15, right: 10, bottom: 10, left: 10 },
      theme: 'grid',
      columnStyles: columns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width }
        }
        return acc
      }, {} as any)
    })

    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )

      // Add generation date
      const dateStr = new Date().toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(
        `Generated: ${dateStr}`,
        14,
        doc.internal.pageSize.getHeight() - 10
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
