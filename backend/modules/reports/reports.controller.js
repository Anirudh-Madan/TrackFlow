const { Op, fn, col } = require('sequelize');
const {
  Order, OrderItem, Product, User, Role, Challan,
  StockOnHand, StockReserved, StockDamaged,
  Vendor, VendorProductMapping, sequelize
} = require('../../models');

exports.salesReport = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;

    // 1. Default to current month if dates not provided
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = today.toISOString().slice(0, 10);
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = firstDay.toISOString().slice(0, 10);
    }

    // 2. Calculate the previous period dates for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive number of days

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    const prevStartDateStr = prevStart.toISOString().slice(0, 10);
    const prevEndDateStr = prevEnd.toISOString().slice(0, 10);

    // 3. Query all Sales Managers in the system (to ensure 0-sales managers are listed too)
    const salesManagers = await User.findAll({
      include: [{
        model: Role,
        as: 'role',
        where: { name: 'sales_manager' }
      }],
      attributes: ['id', 'name']
    });

    // 4. Query current period orders & items
    const currentOrders = await Order.findAll({
      where: {
        order_date: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.ne]: 'CANCELLED'
        }
      },
      include: [
        {
          model: User,
          as: 'salesManager',
          attributes: ['id', 'name']
        },
        {
          model: OrderItem,
          as: 'items',
          attributes: ['product_id', 'quantity', 'dl_price', 'sm_price', 'line_total'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            }
          ]
        },
        {
          model: Challan,
          as: 'challan',
          attributes: ['id', 'generated_at']
        }
      ]
    });

    // 5. Query previous period orders & items (only need to calculate aggregate totals)
    const prevOrders = await Order.findAll({
      where: {
        order_date: {
          [Op.between]: [prevStartDateStr, prevEndDateStr]
        },
        status: {
          [Op.ne]: 'CANCELLED'
        }
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: ['quantity', 'dl_price', 'sm_price', 'line_total']
        },
        {
          model: Challan,
          as: 'challan',
          attributes: ['id']
        }
      ]
    });

    // 6. Aggregate KPIs for current period
    let currentRevenue = 0;
    let currentProfit = 0;
    let currentChallans = 0;

    for (const order of currentOrders) {
      if (order.challan) currentChallans++;
      for (const item of order.items) {
        const lineRev = parseFloat(item.line_total || 0);
        const qty = parseFloat(item.quantity || 0);
        const dlPrice = parseFloat(item.dl_price || 0);
        const lineCost = qty * dlPrice;
        const lineProfit = lineRev - lineCost;

        currentRevenue += lineRev;
        currentProfit += lineProfit;
      }
    }
    const currentMarginPercent = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;

    // 7. Aggregate KPIs for previous period
    let prevRevenue = 0;
    let prevProfit = 0;
    let prevChallans = 0;

    for (const order of prevOrders) {
      if (order.challan) prevChallans++;
      for (const item of order.items) {
        const lineRev = parseFloat(item.line_total || 0);
        const qty = parseFloat(item.quantity || 0);
        const dlPrice = parseFloat(item.dl_price || 0);
        const lineCost = qty * dlPrice;
        const lineProfit = lineRev - lineCost;

        prevRevenue += lineRev;
        prevProfit += lineProfit;
      }
    }
    const prevMarginPercent = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

    // 8. Calculate % Changes
    const getChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const kpiSummary = {
      revenue: {
        value: currentRevenue,
        change: getChange(currentRevenue, prevRevenue)
      },
      profit: {
        value: currentProfit,
        change: getChange(currentProfit, prevProfit)
      },
      margin: {
        value: currentMarginPercent,
        change: currentMarginPercent - prevMarginPercent // Margin change is absolute basis points (or relative, but basis points is standard)
      },
      challans: {
        value: currentChallans,
        change: getChange(currentChallans, prevChallans)
      }
    };

    // 9. Salesman Performance list
    const salesmanMap = {};
    salesManagers.forEach(sm => {
      salesmanMap[sm.id] = {
        id: sm.id,
        name: sm.name,
        revenue: 0,
        profit: 0,
        challans: 0
      };
    });

    for (const order of currentOrders) {
      const sm = order.salesManager;
      if (!sm) continue;
      
      // Ensure key exists
      if (!salesmanMap[sm.id]) {
        salesmanMap[sm.id] = { id: sm.id, name: sm.name, revenue: 0, profit: 0, challans: 0 };
      }

      const smData = salesmanMap[sm.id];
      if (order.challan) smData.challans++;

      for (const item of order.items) {
        const lineRev = parseFloat(item.line_total || 0);
        const qty = parseFloat(item.quantity || 0);
        const dlPrice = parseFloat(item.dl_price || 0);
        const lineCost = qty * dlPrice;
        const lineProfit = lineRev - lineCost;

        smData.revenue += lineRev;
        smData.profit += lineProfit;
      }
    }

    const salesmanPerformance = Object.values(salesmanMap).map(sm => {
      const margin = sm.revenue > 0 ? (sm.profit / sm.revenue) * 100 : 0;
      return {
        id: sm.id,
        name: sm.name,
        revenue: sm.revenue,
        marginPercent: Math.round(margin * 100) / 100,
        challans: sm.challans
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 10. Supplier Breakdown list
    const supplierMap = {};
    for (const order of currentOrders) {
      const supplierName = order.supplier ? order.supplier.trim() : 'Direct';
      if (!supplierMap[supplierName]) {
        supplierMap[supplierName] = { name: supplierName, revenue: 0, profit: 0 };
      }
      const suppData = supplierMap[supplierName];
      for (const item of order.items) {
        const lineRev = parseFloat(item.line_total || 0);
        const qty = parseFloat(item.quantity || 0);
        const dlPrice = parseFloat(item.dl_price || 0);
        const lineCost = qty * dlPrice;
        const lineProfit = lineRev - lineCost;

        suppData.revenue += lineRev;
        suppData.profit += lineProfit;
      }
    }

    const supplierBreakdown = Object.values(supplierMap).map(supp => {
      const margin = supp.revenue > 0 ? (supp.profit / supp.revenue) * 100 : 0;
      return {
        name: supp.name,
        revenue: supp.revenue,
        marginPercent: Math.round(margin * 100) / 100
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 11. Top Parts by Revenue & Lowest Selling Parts
    // Initialize sales tracker for all products
    const products = await Product.findAll({
      attributes: ['id', 'name', 'sku', 'purchase_price', 'dealer_landing_price', 'reorder_threshold'],
      include: [
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] }
      ]
    });

    // Fetch damaged totals per product
    const damagedTotals = await StockDamaged.findAll({
      attributes: ['product_id', [fn('SUM', col('quantity')), 'total_damaged']],
      group: ['product_id'],
      raw: true,
    });
    const damagedMap = {};
    damagedTotals.forEach(d => { damagedMap[d.product_id] = parseFloat(d.total_damaged) || 0; });

    const productSalesMap = {};
    products.forEach(p => {
      const onHand = parseFloat(p.stockOnHand?.quantity || 0);
      const reserved = parseFloat(p.stockReserved?.quantity || 0);
      const damaged = damagedMap[p.id] || 0;
      const available = onHand - reserved - damaged;

      productSalesMap[p.id] = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        availableStock: available,
        quantitySold: 0,
        revenue: 0,
        profit: 0
      };
    });

    // Populate actual sales
    for (const order of currentOrders) {
      for (const item of order.items) {
        if (!item.product_id || !productSalesMap[item.product_id]) continue;
        const itemSales = productSalesMap[item.product_id];
        
        const lineRev = parseFloat(item.line_total || 0);
        const qty = parseFloat(item.quantity || 0);
        const dlPrice = parseFloat(item.dl_price || 0);
        const lineCost = qty * dlPrice;
        const lineProfit = lineRev - lineCost;

        itemSales.quantitySold += qty;
        itemSales.revenue += lineRev;
        itemSales.profit += lineProfit;
      }
    }

    const allProductSales = Object.values(productSalesMap);

    // Top 5 parts by revenue (only include products that had non-zero sales, sorted by revenue)
    const topPartsByRevenue = [...allProductSales]
      .filter(p => p.revenue > 0)
      .map(p => {
        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          revenue: p.revenue,
          marginPercent: Math.round(margin * 100) / 100,
          quantitySold: p.quantitySold
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top 5 lowest selling parts (all products sorted by quantity sold ascending, including those with 0 sales)
    const lowestSellingParts = [...allProductSales]
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantitySold: p.quantitySold,
        availableStock: p.availableStock
      }))
      .sort((a, b) => {
        if (a.quantitySold !== b.quantitySold) {
          return a.quantitySold - b.quantitySold; // primary sort: sales asc
        }
        return b.availableStock - a.availableStock; // secondary sort: higher stock first (more critical)
      })
      .slice(0, 5);

    // 12. Inventory Snapshot
    let totalStockValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of products) {
      const onHand = parseFloat(p.stockOnHand?.quantity || 0);
      const reserved = parseFloat(p.stockReserved?.quantity || 0);
      const damaged = damagedMap[p.id] || 0;
      const available = onHand - reserved - damaged;
      const threshold = p.reorder_threshold || 0;

      const price = parseFloat(p.dealer_landing_price || p.purchase_price || 0);
      totalStockValue += onHand * price;

      if (available <= 0) {
        outOfStockCount++;
      } else if (threshold > 0 && available <= threshold) {
        lowStockCount++;
      }
    }

    const inventorySnapshot = {
      stockValue: totalStockValue,
      outOfStock: outOfStockCount,
      lowStock: lowStockCount
    };

    // Return everything!
    return res.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        prevDateRange: { startDate: prevStartDateStr, endDate: prevEndDateStr },
        kpis: kpiSummary,
        salesmanPerformance,
        supplierBreakdown,
        topPartsByRevenue,
        lowestSellingParts,
        inventorySnapshot
      }
    });
  } catch (error) {
    return next(error);
  }
};

exports.belowDlReport = async (req, res, next) => {
  try {
    const { startDate, endDate, salesManagerId, searchPart, searchChallan } = req.query;

    const whereOrder = {
      status: {
        [Op.ne]: 'CANCELLED'
      }
    };

    if (startDate && endDate) {
      whereOrder.order_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (salesManagerId) {
      whereOrder.sales_manager_id = salesManagerId;
    }

    const items = await OrderItem.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku']
        },
        {
          model: Order,
          as: 'order',
          where: whereOrder,
          attributes: ['id', 'order_number', 'order_date', 'challan_number', 'sales_manager_id'],
          include: [
            {
              model: User,
              as: 'salesManager',
              attributes: ['id', 'name']
            },
            {
              model: Challan,
              as: 'challan',
              attributes: ['id', 'challan_number']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const filtered = items.filter(item => {
      const dl = parseFloat(item.dl_price || 0);
      const sm = parseFloat(item.sm_price || 0);
      
      // sold below DL
      if (dl <= 0 || sm >= dl) return false;

      // Filter by Part SKU/Name
      if (searchPart) {
        const q = searchPart.trim().toLowerCase();
        const sku = (item.product?.sku || item.part_number || '').toLowerCase();
        const name = (item.product?.name || item.description || '').toLowerCase();
        if (!sku.includes(q) && !name.includes(q)) return false;
      }

      // Filter by Challan / Order number
      if (searchChallan) {
        const q = searchChallan.trim().toLowerCase();
        const challanNum = (item.order?.challan?.challan_number || item.order?.challan_number || '').toLowerCase();
        const orderNum = (item.order?.order_number || '').toLowerCase();
        if (!challanNum.includes(q) && !orderNum.includes(q)) return false;
      }

      return true;
    });

    const formatted = filtered.map(item => {
      const quantity = parseFloat(item.quantity || 0);
      const dlPrice = parseFloat(item.dl_price || 0);
      const smPrice = parseFloat(item.sm_price || 0);
      const lossPerUnit = smPrice - dlPrice; // Negative
      const totalLoss = lossPerUnit * quantity; // Negative

      return {
        id: item.id,
        partNumber: item.product?.sku || item.part_number || '—',
        partName: item.product?.name || item.description || '—',
        challanNumber: item.order?.challan?.challan_number || item.order?.challan_number || `#${item.order?.order_number}` || '—',
        salesmanName: item.order?.salesManager?.name || '—',
        dlPrice,
        smPrice,
        lossPerUnit,
        quantity,
        totalLoss
      };
    });

    return res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    return next(error);
  }
};

exports.stockReport = async (req, res, next) => {
  try {
    // 1. Fetch all products with their stock rows and vendor mappings
    const products = await Product.findAll({
      include: [
        { model: StockOnHand,  as: 'stockOnHand',  attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
        {
          model: VendorProductMapping,
          as: 'vendorMappings',
          include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'company_name'] }]
        }
      ],
      paranoid: true
    });

    // 2. Build a map of product_id -> total damaged quantity
    const damagedRows = await StockDamaged.findAll({ attributes: ['product_id', 'quantity'] });
    const damagedMap = {};
    for (const d of damagedRows) {
      damagedMap[d.product_id] = (damagedMap[d.product_id] || 0) + parseFloat(d.quantity || 0);
    }

    // 3. Fetch all-time sold quantities per product
    const soldItems = await OrderItem.findAll({
      include: [{
        model: Order,
        as: 'order',
        where: { status: { [Op.ne]: 'CANCELLED' } },
        attributes: []
      }],
      attributes: ['product_id', [fn('SUM', col('quantity')), 'totalSold']],
      group: ['product_id'],
      raw: true
    });
    const soldMap = {};
    for (const s of soldItems) soldMap[s.product_id] = parseFloat(s.totalSold || 0);

    // 4. Compute per-product stats and group by supplier (vendor)
    let totalStockValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let deadStockCount = 0;

    // supplier key → { name, parts: Set<id>, units, value }
    const supplierMap = {};

    for (const p of products) {
      const onHand   = parseFloat(p.stockOnHand?.quantity   || 0);
      const reserved = parseFloat(p.stockReserved?.quantity || 0);
      const damaged  = damagedMap[p.id] || 0;
      const available = Math.max(0, onHand - reserved - damaged);
      const threshold = p.reorder_threshold || 0;
      const cost      = parseFloat(p.dealer_landing_price || p.purchase_price || 0);
      const stockVal  = onHand * cost;
      const everSold  = (soldMap[p.id] || 0) > 0;

      totalStockValue += stockVal;

      if (available <= 0)                         outOfStockCount++;
      else if (threshold > 0 && available < threshold) lowStockCount++;

      if (!everSold && onHand > 0) deadStockCount++;

      // Assign product to vendors; if no vendor, use "Direct / Unassigned"
      const mappings = p.vendorMappings || [];
      const vendors  = mappings.length > 0
        ? mappings.map(vm => ({ id: vm.vendor?.id || 0, name: vm.vendor?.company_name || 'Unassigned' }))
        : [{ id: 0, name: 'Direct / Unassigned' }];

      for (const v of vendors) {
        const key = v.id;
        if (!supplierMap[key]) {
          supplierMap[key] = { name: v.name, partIds: new Set(), units: 0, value: 0 };
        }
        supplierMap[key].partIds.add(p.id);
        supplierMap[key].units += onHand;
        supplierMap[key].value += stockVal;
      }
    }

    // 5. Build sorted supplier rows
    const supplierRows = Object.values(supplierMap)
      .map(s => ({
        name:  s.name,
        parts: s.partIds.size,
        units: Math.round(s.units),
        value: Math.round(s.value * 100) / 100
      }))
      .sort((a, b) => b.value - a.value);

    return res.json({
      success: true,
      data: {
        kpis: {
          stockValue:     Math.round(totalStockValue * 100) / 100,
          outOfStock:     outOfStockCount,
          lowStock:       lowStockCount,
          deadStock:      deadStockCount,
          totalProducts:  products.length
        },
        supplierBreakdown: supplierRows
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ── GET /api/v1/reports/salesman-wise ─────────────────────────────────────────
exports.salesmanWise = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = today.toISOString().slice(0, 10);
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    }

    const { Customer, PurchaseOrder } = require('../../models');

    const salesManagers = await User.findAll({
      include: [{ model: require('../../models').Role, as: 'role', where: { name: 'sales_manager' } }],
      attributes: ['id', 'name'],
    });

    const orders = await Order.findAll({
      where: { order_date: { [Op.between]: [startDate, endDate] } },
      include: [
        { model: User, as: 'salesManager', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
      ],
    });

    const challans = await require('../../models').Challan.findAll({
      where: { created_at: { [Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59'] } },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    });

    const smMap = {};
    salesManagers.forEach(sm => {
      smMap[sm.id] = { id: sm.id, name: sm.name, orders: 0, order_value: 0, items_sold: 0, challans: 0 };
    });

    orders.forEach(o => {
      const smId = o.sales_manager_id;
      if (!smMap[smId]) smMap[smId] = { id: smId, name: o.salesManager?.name || 'Unknown', orders: 0, order_value: 0, items_sold: 0, challans: 0 };
      smMap[smId].orders++;
      smMap[smId].order_value += parseFloat(o.grand_total || 0);
      smMap[smId].items_sold  += o.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    });

    challans.forEach(c => {
      const creatorId = c.created_by;
      if (smMap[creatorId]) smMap[creatorId].challans++;
    });

    const data = Object.values(smMap).sort((a, b) => b.order_value - a.order_value);
    res.json({ success: true, data, period: { startDate, endDate } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/reports/party-wise ───────────────────────────────────────────
exports.partyWise = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = today.toISOString().slice(0, 10);
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    }

    const { Customer } = require('../../models');

    const orders = await Order.findAll({
      where: { order_date: { [Op.between]: [startDate, endDate] } },
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name'] },
        { model: OrderItem, as: 'items' },
      ],
    });

    const partyMap = {};
    orders.forEach(o => {
      const pid = o.party_id;
      const name = o.party?.company_name || o.customer_company || 'Unknown';
      if (!partyMap[pid]) partyMap[pid] = { id: pid, name, orders: 0, total_value: 0, items_count: 0 };
      partyMap[pid].orders++;
      partyMap[pid].total_value  += parseFloat(o.grand_total || 0);
      partyMap[pid].items_count  += o.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    });

    const data = Object.values(partyMap).sort((a, b) => b.total_value - a.total_value);
    res.json({ success: true, data, period: { startDate, endDate } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/reports/supplier-wise ────────────────────────────────────────
exports.supplierWise = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = today.toISOString().slice(0, 10);
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    }

    const { PurchaseOrder, PurchaseOrderItem, Vendor } = require('../../models');

    const pos = await PurchaseOrder.findAll({
      where: { created_at: { [Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59'] }, is_returned: false },
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'company_name'] },
        { model: PurchaseOrderItem, as: 'items' },
      ],
    });

    const supplierMap = {};
    pos.forEach(po => {
      const sid = po.vendor_id || 'manual';
      const name = po.vendor?.company_name || po.vendor_name || 'Manual';
      if (!supplierMap[sid]) supplierMap[sid] = { id: sid, name, pos: 0, total_value: 0, items_count: 0 };
      supplierMap[sid].pos++;
      supplierMap[sid].total_value  += parseFloat(po.total || 0);
      supplierMap[sid].items_count  += po.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    });

    const data = Object.values(supplierMap).sort((a, b) => b.total_value - a.total_value);
    res.json({ success: true, data, period: { startDate, endDate } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/reports/activity-log ─────────────────────────────────────────
exports.activityLog = async (req, res, next) => {
  try {
    const { AuditLog } = require('../../models');
    const { user_id, startDate, endDate, limit = 100 } = req.query;
    const where = {};
    if (user_id) where.actor_id = user_id;
    if (startDate && endDate) where.created_at = { [Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59'] };

    const logs = await AuditLog.findAll({ where, order: [['created_at', 'DESC']], limit: parseInt(limit) });
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// ── POST /api/v1/reports/ai-insight ──────────────────────────────────────────
// Body: { reportType: 'salesman'|'party'|'supplier', data: {...} }
exports.aiInsight = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const { reportType, data } = req.body;
    if (!reportType || !data) return res.status(400).json({ success: false, error: 'reportType and data are required' });

    const { generateReportInsight } = require('../../services/aiService');
    const insight = await generateReportInsight(reportType, data);
    res.json({ success: true, insight });
  } catch (err) { next(err); }
};
