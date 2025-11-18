import React from 'react'
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from './button'
import { Progress } from './progress'

export interface UploadProgress {
  step: string
  percentage: number
  message: string
  current?: number
  total?: number
}

export interface UploadResult {
  success: boolean
  message: string
  stats?: {
    customers: number
    transactions: number
    payments: number
    items: number
    serviceSales: number
  }
}

interface UploadProgressModalProps {
  isOpen: boolean
  onClose: () => void
  progress: UploadProgress | null
  result: UploadResult | null
  uploading: boolean
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  result,
  uploading
}) => {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow closing if not uploading and result exists
    if (!uploading && result && e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    if (!uploading && result) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[51]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {uploading ? 'Uploading Data...' : result?.success ? 'Upload Complete' : 'Upload Failed'}
          </h2>
          {!uploading && result && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Display */}
          {uploading && progress ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{progress.step || 'Processing...'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{progress.message || 'Please wait...'}</p>
                </div>
                <div className="text-sm font-medium text-primary">
                  {progress.percentage || 0}%
                </div>
              </div>

              <Progress value={progress.percentage || 0} className="h-2" />

              {progress.current !== undefined && progress.total !== undefined && (
                <p className="text-xs text-muted-foreground text-center">
                  Processing {progress.current} of {progress.total}
                </p>
              )}
            </div>
          ) : uploading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Initializing upload...</p>
                  <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Result Display */}
          {!uploading && result && (
            <div className="space-y-4">
              {/* Status Icon and Message */}
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
                  : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
              }`}>
                {result.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.success ? 'Success!' : 'Upload Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    result.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              {result.success && result.stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Customers</p>
                    <p className="text-2xl font-bold text-foreground">{result.stats.customers.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-foreground">{result.stats.transactions.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Payments</p>
                    <p className="text-2xl font-bold text-foreground">{result.stats.payments.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Items</p>
                    <p className="text-2xl font-bold text-foreground">{result.stats.items.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Service Sales</p>
                    <p className="text-2xl font-bold text-foreground">{result.stats.serviceSales.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!uploading && result && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <Button onClick={handleClose} variant="default">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
