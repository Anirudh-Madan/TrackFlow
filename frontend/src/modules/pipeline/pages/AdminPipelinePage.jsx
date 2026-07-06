import PipelineBoard from '../components/PipelineBoard'

/**
 * Admin pipeline page. In the current flow the Admin is not a required approval
 * gate — orders go straight to the IM. The Admin instead has full oversight and
 * can intervene (override) at ANY stage to keep the pipeline moving.
 */
export default function AdminPipelinePage() {
  return (
    <PipelineBoard
      title="Pipeline — Admin Oversight"
      subtitle="Full visibility across every order. Step in at any stage to clear a bottleneck — overrides are logged."
    />
  )
}
