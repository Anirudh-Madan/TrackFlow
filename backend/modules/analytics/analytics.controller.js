const { Op, fn, col, literal } = require('sequelize');
const {
  FulfillmentOrder, PipelineTracking, PipelineStageHistory, PipelineItem,
  Order, OrderItem, Product, User, Role, PartRequest, ReorderFlag,
  sequelize,
} = require('../../models');

const STAGES = ['IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED'];
const STAGE_LABEL = {
  ADMIN_APPROVAL: 'Admin Approval',
  IM_APPROVAL: 'IM Approval',
  DW_ASSIGNMENT: 'Worker Assignment',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FULFILLED: 'Fulfilled',
};

// Milestone timestamp columns per stage, used for dwell-time (bottleneck) calc.
const STAGE_TS = {
  ADMIN_APPROVAL: 'admin_approved_at',
  IM_APPROVAL: 'im_approved_at',
  DW_ASSIGNMENT: 'dw_assigned_at',
  OUT_FOR_DELIVERY: 'out_for_delivery_at',
  DELIVERED: 'delivered_at',
  FULFILLED: 'fulfilled_at',
};

exports.overview = async (req, res, next) => {
  try {
    // ── 1. Completion (master ledger) ─────────────────────────────────────────
    const totalFulfillment = await FulfillmentOrder.count();
    const completed = await FulfillmentOrder.count({ where: { state: 'COMPLETE' } });
    const incomplete = totalFulfillment - completed;
    const completionRate = totalFulfillment ? Math.round((completed / totalFulfillment) * 100) : 0;

    // ── 2. Funnel — count of pipelines currently at each stage ─────────────────
    const stageRows = await PipelineTracking.findAll({
      attributes: ['stage', [fn('COUNT', col('id')), 'count']], group: ['stage'], raw: true,
    });
    const stageCounts = {};
    stageRows.forEach(r => { stageCounts[r.stage] = parseInt(r.count, 10); });
    const funnel = STAGES.map(s => ({ stage: s, label: STAGE_LABEL[s], count: stageCounts[s] || 0 }));
    const rejected = stageCounts['REJECTED'] || 0;

    // ── 3. Bottleneck — average dwell time per stage (hours) ───────────────────
    // Computed from consecutive milestone timestamps across all pipelines.
    const pipelines = await PipelineTracking.findAll({ raw: true });
    const dwellTotals = {}; const dwellCounts = {};
    STAGES.forEach(s => { dwellTotals[s] = 0; dwellCounts[s] = 0; });

    for (const p of pipelines) {
      for (let i = 0; i < STAGES.length - 1; i++) {
        const from = STAGES[i], to = STAGES[i + 1];
        const tFrom = p[STAGE_TS[from]], tTo = p[STAGE_TS[to]];
        if (tFrom && tTo) {
          const hours = (new Date(tTo) - new Date(tFrom)) / 36e5;
          if (hours >= 0) { dwellTotals[from] += hours; dwellCounts[from] += 1; }
        }
      }
    }
    const bottlenecks = STAGES.slice(0, -1).map(s => ({
      stage: s, label: STAGE_LABEL[s],
      avg_hours: dwellCounts[s] ? Math.round((dwellTotals[s] / dwellCounts[s]) * 10) / 10 : 0,
      samples: dwellCounts[s],
    }));
    const worst = bottlenecks.reduce((a, b) => (b.avg_hours > (a?.avg_hours || 0) ? b : a), null);

    // ── 4. Admin overrides ─────────────────────────────────────────────────────
    const overrideRows = await PipelineStageHistory.findAll({
      where: { is_admin_override: true },
      attributes: ['to_stage', [fn('COUNT', col('id')), 'count']], group: ['to_stage'], raw: true,
    });
    const overridesByStage = overrideRows.map(r => ({ stage: r.to_stage, label: STAGE_LABEL[r.to_stage] || r.to_stage, count: parseInt(r.count, 10) }));
    const totalOverrides = overridesByStage.reduce((s, r) => s + r.count, 0);

    // ── 5. Throughput — fulfilled per day (last 14 days) ───────────────────────
    const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0);
    const fulfilledRows = await FulfillmentOrder.findAll({
      where: { state: 'COMPLETE', completed_at: { [Op.gte]: since } },
      attributes: ['completed_at'], raw: true,
    });
    const byDay = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(since); d.setDate(since.getDate() + i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    fulfilledRows.forEach(r => {
      const key = new Date(r.completed_at).toISOString().slice(0, 10);
      if (key in byDay) byDay[key] += 1;
    });
    const throughput = Object.entries(byDay).map(([date, count]) => ({ date, count }));

    // ── 6. Reorder pressure — open part requests + reorder flags by product ────
    const openRequests = await PartRequest.findAll({
      where: { status: { [Op.in]: ['OPEN', 'ACKNOWLEDGED'] } },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
      raw: true, nest: true,
    });
    const pressureMap = {};
    openRequests.forEach(r => {
      const key = r.product?.sku || `req-${r.id}`;
      if (!pressureMap[key]) pressureMap[key] = { sku: r.product?.sku || '—', name: r.product?.name || r.proposed_name || 'New part', quantity: 0, requests: 0 };
      pressureMap[key].quantity += r.quantity;
      pressureMap[key].requests += 1;
    });
    const reorderPressure = Object.values(pressureMap).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    const openReorderFlags = await ReorderFlag.count({ where: { status: 'OPEN' } });

    // ── 7. Per-role workload — active pipelines per user ───────────────────────
    const activeStages = ['IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const imWorkload = await PipelineTracking.findAll({
      where: { stage: { [Op.in]: activeStages }, im_approved_by: { [Op.ne]: null } },
      attributes: ['im_approved_by', [fn('COUNT', col('PipelineTracking.id')), 'count']],
      include: [{ model: User, as: 'imApprover', attributes: ['name'] }],
      group: ['im_approved_by', 'imApprover.id', 'imApprover.name'], raw: true, nest: true,
    });
    const dwWorkload = await PipelineTracking.findAll({
      where: { stage: { [Op.in]: ['DW_ASSIGNMENT', 'OUT_FOR_DELIVERY'] }, dw_id: { [Op.ne]: null } },
      attributes: ['dw_id', [fn('COUNT', col('PipelineTracking.id')), 'count']],
      include: [{ model: User, as: 'dispatchWorker', attributes: ['name'] }],
      group: ['dw_id', 'dispatchWorker.id', 'dispatchWorker.name'], raw: true, nest: true,
    });
    const workload = {
      im: imWorkload.map(r => ({ name: r.imApprover?.name || '—', count: parseInt(r.count, 10) })),
      dw: dwWorkload.map(r => ({ name: r.dispatchWorker?.name || '—', count: parseInt(r.count, 10) })),
    };

    // ── Headline counts ────────────────────────────────────────────────────────
    const totalOrders = await Order.count();
    const pendingApproval = await Order.count({ where: { status: 'PENDING' } });
    const inPipeline = await PipelineTracking.count({ where: { stage: { [Op.in]: activeStages } } });

    res.json({
      success: true,
      data: {
        headline: {
          total_orders: totalOrders,
          pending_approval: pendingApproval,
          pending_admin_approval: pendingApproval,
          in_pipeline: inPipeline,
          completed,
          incomplete,
          completion_rate: completionRate,
          rejected,
          total_overrides: totalOverrides,
          open_reorder_flags: openReorderFlags,
        },
        completion: { completed, incomplete, total: totalFulfillment, rate: completionRate },
        funnel,
        bottlenecks,
        worst_bottleneck: worst,
        overrides: overridesByStage,
        throughput,
        reorder_pressure: reorderPressure,
        workload,
      },
    });
  } catch (err) { next(err); }
};

// ─── Pipeline flow view (admin) — full list with actor names + item counts ────
exports.flow = async (req, res, next) => {
  try {
    const pipelines = await PipelineTracking.findAll({
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_number', 'grand_total'] },
        { model: PipelineItem, as: 'items', attributes: ['id', 'quantity'] },
        { model: User, as: 'adminApprover', attributes: ['name'] },
        { model: User, as: 'imApprover', attributes: ['name'] },
        { model: User, as: 'dispatchWorker', attributes: ['name'] },
        { model: User, as: 'salesManager', attributes: ['name'] },
      ],
      order: [['updated_at', 'DESC']],
    });
    res.json({ success: true, data: pipelines });
  } catch (err) { next(err); }
};
