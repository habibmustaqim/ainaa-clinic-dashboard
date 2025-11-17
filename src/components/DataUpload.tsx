import React, { useState } from 'react'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  processAndUploadData,
  startLogCapture,
  stopLogCapture,
  downloadUploadLogs,
  type UploadFiles,
  type UploadProgress,
} from '@/utils/uploadProcessor'

interface FileInputProps {
  label: string
  description: string
  accept: string
  file: File | null
  onChange: (file: File | null) => void
  required?: boolean
}

const FileInput: React.FC<FileInputProps> = ({
  label,
  description,
  accept,
  file,
  onChange,
  required = true,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    onChange(selectedFile)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/80">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-primary/10 dark:file:bg-primary file:text-primary dark:file:text-primary-foreground
            hover:file:bg-primary/20 dark:hover:file:bg-primary/80
            file:cursor-pointer cursor-pointer
            border border-border rounded-lg bg-input
            focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>
      {file && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 size={16} />
          <span>{file.name}</span>
        </div>
      )}
    </div>
  )
}

export const DataUpload: React.FC = () => {
  const [files, setFiles] = useState<{
    customerInfo: File | null
    visitFrequency: File | null
    salesDetailed: File | null
    payment: File | null
    itemSales: File | null
    serviceSales: File | null
  }>({
    customerInfo: null,
    visitFrequency: null,
    salesDetailed: null,
    payment: null,
    itemSales: null,
    serviceSales: null,
  })

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    stats?: any
  } | null>(null)

  const allFilesSelected = Object.values(files).every((file) => file !== null)

  const handleUpload = async () => {
    if (!allFilesSelected) {
      alert('Please select all required files')
      return
    }

    setUploading(true)
    setProgress(null)
    setResult(null)

    // Start capturing logs
    startLogCapture()

    try {
      const uploadFiles: UploadFiles = {
        customerInfo: files.customerInfo!,
        visitFrequency: files.visitFrequency!,
        salesDetailed: files.salesDetailed!,
        payment: files.payment!,
        itemSales: files.itemSales!,
        serviceSales: files.serviceSales!,
      }

      const uploadResult = await processAndUploadData(uploadFiles, (progressData) => {
        setProgress(progressData)
      })

      setResult({
        success: uploadResult.success,
        message: uploadResult.message,
        stats: uploadResult.stats,
      })
    } catch (error) {
      console.error('Upload error:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setUploading(false)
      stopLogCapture()
    }
  }

  const handleReset = () => {
    setFiles({
      customerInfo: null,
      visitFrequency: null,
      salesDetailed: null,
      payment: null,
      itemSales: null,
      serviceSales: null,
    })
    setProgress(null)
    setResult(null)
  }

  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Data Upload"
        subtitle="Upload your clinic data files. All 6 files are required for processing."
        icon={Database}
        iconVariant="gradient"
        iconColor="primary"
        size="lg"
        animation="fade-in"
      />

      {/* File Upload Card */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Upload Files</h2>
            <p className="text-sm text-muted-foreground">
              Select all required files to begin the upload process
            </p>
          </div>

          {/* File Inputs */}
          <div className="grid gap-6">
            <FileInput
              label="Customer Info CSV"
              description="Customer information and demographics"
              accept=".csv"
              file={files.customerInfo}
              onChange={(file) => setFiles({ ...files, customerInfo: file })}
            />

            <FileInput
              label="Customer Visit Frequency CSV"
              description="Aggregated customer visit and spending metrics"
              accept=".csv"
              file={files.visitFrequency}
              onChange={(file) => setFiles({ ...files, visitFrequency: file })}
            />

            <FileInput
              label="Sales Detailed CSV"
              description="Detailed transaction records (first 15 rows will be skipped)"
              accept=".csv"
              file={files.salesDetailed}
              onChange={(file) => setFiles({ ...files, salesDetailed: file })}
            />

            <FileInput
              label="Payment Excel"
              description="Payment transaction details"
              accept=".xlsx,.xls"
              file={files.payment}
              onChange={(file) => setFiles({ ...files, payment: file })}
            />

            <FileInput
              label="Item Sales Excel"
              description="Item-level sales data (first 18 rows will be skipped)"
              accept=".xlsx,.xls"
              file={files.itemSales}
              onChange={(file) => setFiles({ ...files, itemSales: file })}
            />

            <FileInput
              label="Service Sales CSV"
              description="Service sales and enhanced item data (first 15 rows will be skipped)"
              accept=".csv"
              file={files.serviceSales}
              onChange={(file) => setFiles({ ...files, serviceSales: file })}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleUpload}
              disabled={!allFilesSelected || uploading}
              className="flex-1"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload Data
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              disabled={uploading}
              variant="outline"
              size="lg"
            >
              Reset
            </Button>

            <Button
              onClick={downloadUploadLogs}
              variant="outline"
              size="lg"
            >
              <Download size={20} />
              Download Logs
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress Card */}
      {progress && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{progress.step}</h3>
              <span className="text-sm font-medium text-foreground/70">
                {progress.percentage}%
              </span>
            </div>

            <Progress value={progress.percentage} className="h-3" />

            <div className="flex items-center gap-2 text-sm text-foreground/70">
              {progress.percentage === 100 ? (
                <CheckCircle2 className="text-success" size={16} />
              ) : (
                <Loader2 className="animate-spin" size={16} />
              )}
              <span>{progress.message}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Progress: {progress.current} / {progress.total}
            </div>
          </div>
        </Card>
      )}

      {/* Result Card */}
      {result && (
        <Card
          className={`p-6 border-2 ${
            result.success
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
              ) : (
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              )}
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Upload Successful' : 'Upload Failed'}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>

            {result.success && result.stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {result.stats.customersInserted.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {result.stats.transactionsInserted.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {result.stats.paymentsInserted.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {result.stats.itemsInserted.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {result.stats.enhancedItemsInserted.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Enhanced Items</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </PageContainer>
  )
}
