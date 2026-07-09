const { Op } = require('sequelize');
const {
  PurchaseOrder, PurchaseOrderItem, Vendor, Product, User, Order, OrderItem, Customer,
  sequelize,
} = require('../../models');

// ── Helpers ───────────────────────────────────────────────────────────────────
function genPONumber() {
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

function genInvoiceNumber() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(10000 + Math.random() * 90000))}`;
}

// ── GET /api/v1/purchase-orders  ──────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const where = {};
    // SM sees only their POs; admin sees all
    if (req.user.role === 'sales_manager') where.created_by = req.user.id;

    const pos = await PurchaseOrder.findAll({
      where,
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'company_name', 'gst'] },
        { model: User,   as: 'creator', attributes: ['id', 'name'] },
        {
          model: PurchaseOrderItem, as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'dealer_landing_price'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: pos });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/order-items ──────────────────────────────────
// Returns all order_items from the SM's own orders (for the Order History tab)
exports.getOrderItems = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'sales_manager') where['$order.sales_manager_id$'] = req.user.id;

    const items = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          where: req.user.role === 'sales_manager' ? { sales_manager_id: req.user.id } : {},
          attributes: ['id', 'order_number', 'order_date', 'status', 'supplier', 'customer_company', 'challan_number'],
          include: [
            { model: Customer, as: 'party', attributes: ['id', 'company_name'], required: false },
          ],
        },
        {
          model: Product, as: 'product',
          attributes: ['id', 'name', 'sku', 'dealer_landing_price'],
          required: false,
        },
      ],
      order: [[{ model: Order, as: 'order' }, 'created_at', 'DESC']],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

// ── POST /api/v1/purchase-orders ──────────────────────────────────────────────
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { vendor_id, vendor_name, po_date, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'At least one item is required' });
    }

    const po_number = genPONumber();
    const invoice_number = genInvoiceNumber();

    let resolvedVendorName = vendor_name || null;
    if (vendor_id && !resolvedVendorName) {
      const vendor = await Vendor.findByPk(vendor_id, { transaction: t });
      resolvedVendorName = vendor?.company_name || null;
    }

    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of items) {
      const qty   = parseInt(item.quantity) || 1;
      const price = parseFloat(item.unit_price) || 0;
      const total = +(qty * price).toFixed(2);
      subtotal += total;

      // Optionally validate/resolve product
      let product_id = item.product_id || null;
      if (!product_id && item.part_number) {
        const found = await Product.findOne({ where: { sku: item.part_number }, transaction: t });
        if (found) product_id = found.id;
      }

      itemsToCreate.push({
        product_id,
        part_number: item.part_number || null,
        description: item.description || null,
        unit_price: price,
        quantity: qty,
        total,
      });
    }

    const po = await PurchaseOrder.create({
      po_number,
      invoice_number,
      vendor_id: vendor_id || null,
      vendor_name: resolvedVendorName,
      po_date: po_date || new Date(),
      notes: notes || null,
      status: 'SUBMITTED',
      subtotal: +subtotal.toFixed(2),
      total: +subtotal.toFixed(2),
      created_by: req.user.id,
    }, { transaction: t });

    for (const item of itemsToCreate) {
      await PurchaseOrderItem.create({ purchase_order_id: po.id, ...item }, { transaction: t });
    }

    await t.commit();

    const result = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'company_name', 'gst'] },
        { model: User,   as: 'creator', attributes: ['id', 'name'] },
        {
          model: PurchaseOrderItem, as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
        },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
