import { cn } from '../../../utils/cn'
import { PIPELINE_FLOW, PIPELINE_STAGE, stageConfig } from '../constants'

/**
 * Compact horizontal stepper showing where an order sits in the pipeline.
 * Rejected pipelines render a single danger chip.
 */
export default function PipelineProgress({ stage }) {
  if (stage === 'REJECTED') {
    const cfg = stageConfig('REJECTED')
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cfg.color)}>
        Rejected
      </span>
    )
  }

  const currentStep = PIPELINE_STAGE[stage]?.step ?? 0

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_FLOW.map((key, idx) => {
        const cfg = PIPELINE_STAGE[key]
        const done = idx <= currentStep
        const isCurrent = idx === currentStep
        const Icon = cfg.icon
        return (
          <div key={key} className="flex items-center gap-1">
            <div
              title={cfg.label}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
                done
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-surface-300 bg-white text-surface-400 dark:border-surface-600 dark:bg-surface-800',
                isCurrent && 'ring-2 ring-primary-200 dark:ring-primary-900'
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            {idx < PIPELINE_FLOW.length - 1 && (
              <div className={cn('h-0.5 w-4 sm:w-6', idx < currentStep ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
