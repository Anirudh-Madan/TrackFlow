import { ShieldCheck, PackageCheck, UserCheck, Truck, Home, CheckCircle2, XCircle } from 'lucide-react'

// The fulfilment pipeline stages, in order. One source of truth for labels,
// colours and progress across admin / IM / DW / SM views.
export const PIPELINE_STAGE = {
  IM_APPROVAL: {
    label: 'IM Approval',
    step: 0,
    icon: PackageCheck,
    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40',
    hint: 'Awaiting IM to approve, pick parts & assign a worker',
  },
  DW_ASSIGNMENT: {
    label: 'Worker Assigned',
    step: 1,
    icon: UserCheck,
    color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40',
    hint: 'Assigned to a Dispatch Worker, awaiting pickup',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    step: 2,
    icon: Truck,
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/40',
    hint: 'On the way to the Sales Manager',
  },
  DELIVERED: {
    label: 'Delivered',
    step: 3,
    icon: Home,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-900/40',
    hint: 'Delivered — awaiting Sales Manager to confirm received',
  },
  FULFILLED: {
    label: 'Fulfilled',
    step: 4,
    icon: CheckCircle2,
    color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40',
    hint: 'Received & complete — IM notified',
  },
  // Retained for any historical rows; not part of the active flow.
  ADMIN_APPROVAL: {
    label: 'IM Approval',
    step: 0,
    icon: PackageCheck,
    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40',
    hint: 'Awaiting IM approval',
  },
  REJECTED: {
    label: 'Rejected',
    step: -1,
    icon: XCircle,
    color: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40',
    hint: 'Rejected before delivery',
  },
}

export const PIPELINE_FLOW = ['IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED']

export function stageConfig(stage) {
  return PIPELINE_STAGE[stage] || {
    label: stage, step: 0, icon: ShieldCheck, color: 'bg-surface-50 text-surface-700 border-surface-200', hint: '',
  }
}
