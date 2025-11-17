import React from 'react'
import { Layout } from '@/components/Layout'
import { BentoCard } from '@/components/ui/bento-card'
import { Clock, Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ComingSoonProps {
  pageName: string
}

const ComingSoon: React.FC<ComingSoonProps> = ({ pageName }) => {
  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <BentoCard
          variant="gradient"
          className="max-w-2xl w-full text-center p-12"
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Clock className="w-12 h-12 text-primary" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-secondary animate-pulse" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            {pageName}
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            This feature is coming soon! We're working hard to bring you the best experience.
          </p>

          {/* Features Coming */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-semibold text-foreground/80 mb-4 uppercase tracking-wide">
              What to expect
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <span className="text-sm text-muted-foreground">
                  Advanced analytics and insights
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <span className="text-sm text-muted-foreground">
                  Real-time data synchronization
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <span className="text-sm text-muted-foreground">
                  Customizable dashboards
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <span className="text-sm text-muted-foreground">
                  Export and reporting features
                </span>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Progress Indicator */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Development Progress</span>
            </div>
            <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
                style={{ width: '35%' }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">35% Complete</p>
          </div>
        </BentoCard>
      </div>
    </Layout>
  )
}

export default ComingSoon