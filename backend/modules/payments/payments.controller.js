const { Payment, PaymentEditLog, Customer, Order, User, sequelize } = require('../../models');
const { Op } = require('sequelize');

function genPaymentNo() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${num}`;
}

// ── GET /api/v1/payments ──────────────────────────────────────────────────────
exports.listPayments = async (req, res, next) => {
  try {
    const { customer_id, startDate, endDate, status, search } = req.query;

    const where = {};
    if (customer_id) where.customer_id = customer_id;
    if (status && status !== 'all') where.status = status;

    if (startDate && endDate) {
      where.payment_date = { [Op.between]: [startDate, endDate] };
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('customer_name')), 'LIKE', q),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('reference_number')), 'LIKE', q),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('payment_number')), 'LIKE', q),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('received_by')), 'LIKE', q),
      ];
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'company_name', 'gst', 'credit_limit'] },
        { model: PaymentEditLog, as: 'editLogs' },
      ],
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
    });

    const totalCollected = payments.reduce((s, p) => s + (p.status === 'received' ? parseFloat(p.amount || 0) : 0), 0);
    const pendingCount   = payments.filter(p => p.status === 'pending').length;
    const receivedCount  = payments.filter(p => p.status === 'received').length;

    res.json({
      success: true,
      data: payments,
      summary: {
        totalCollected,
        pendingCount,
        receivedCount,
        total: payments.length,
      }
    });
  } catch (err) { next(err); }
};

// ── POST /api/v1/payments ─────────────────────────────────────────────────────
exports.createPayment = async (req, res, next) => {
  try {
    const { customer_id, customer_name, amount, payment_date, mode, reference_number, status, remarks } = req.body;

    const payAmount = parseFloat(amount || 0);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
    }

    let custName = customer_name;
    let custId = customer_id;
    let netBalanceBefore = 0;

    if (customer_id) {
      const cust = await Customer.findByPk(customer_id);
      if (cust) {
        custName = cust.company_name;
      }
      // Calculate current outstanding before this payment
      const orders = await Order.findAll({ where: { party_id: customer_id, status: { [Op.ne]: 'CANCELLED' } } });
      const pastPayments = await Payment.findAll({ where: { customer_id, status: 'received' } });
      const totalInvoiced = orders.reduce((s, o) => s + parseFloat(o.grand_total || 0), 0);
      const totalPaid = pastPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      netBalanceBefore = totalInvoiced - totalPaid;
    }

    const netBalanceAfter = Math.max(0, netBalanceBefore - payAmount);
    const isPartial = netBalanceBefore > 0 && payAmount < netBalanceBefore;
    const paymentType = isPartial ? 'Partial Payment' : (netBalanceBefore > 0 && payAmount >= netBalanceBefore ? 'Full Settlement' : 'Payment Received');

    const payment = await Payment.create({
      payment_number: genPaymentNo(),
      customer_id: custId || null,
      customer_name: custName || 'Unknown Customer',
      amount: payAmount,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      mode: mode || 'UPI',
      reference_number: reference_number?.trim() || null,
      status: status || 'received',
      received_by: req.user?.name || 'Admin',
      remarks: remarks?.trim() || `${paymentType} — Remaining Outstanding: ₹${netBalanceAfter.toLocaleString('en-IN')}`,
    });

    // Auto-create initial edit history record for partial or tracked payments
    await PaymentEditLog.create({
      payment_id: payment.id,
      edited_by: req.user?.name || 'Admin',
      edit_reason: `Initial payment recorded (${paymentType}). Net balance before: ₹${netBalanceBefore.toLocaleString('en-IN')}, Remaining balance: ₹${netBalanceAfter.toLocaleString('en-IN')}`,
      previous_amount: 0,
      new_amount: payAmount,
      changed_fields: {
        payment_type: { from: 'N/A', to: paymentType },
        outstanding_before: { from: 0, to: netBalanceBefore },
        amount_paid: { from: 0, to: payAmount },
        remaining_balance: { from: 0, to: netBalanceAfter },
      },
    });

    res.json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (err) { next(err); }
};

// ── GET /api/v1/payments/daywise-outstandings ─────────────────────────────────
exports.getDaywiseOutstandings = async (req, res, next) => {
  try {
    const { startDate, endDate, customer_id, sm_id } = req.query;

    // 1. Fetch all active customers with their Sales Manager
    const custWhere = {};
    if (customer_id) custWhere.id = customer_id;
    if (sm_id) custWhere.sales_manager_id = sm_id;

    const customers = await Customer.findAll({
      where: custWhere,
      include: [
        { model: User, as: 'salesManager', attributes: ['id', 'name'] }
      ],
      order: [['company_name', 'ASC']]
    });

    // 2. Fetch all valid orders
    const orders = await Order.findAll({
      where: { status: { [Op.ne]: 'CANCELLED' } },
      attributes: ['id', 'order_number', 'challan_number', 'customer_company', 'party_id', 'grand_total', 'order_date', 'created_at']
    });

    // 3. Fetch all payments
    const payments = await Payment.findAll({
      where: { status: { [Op.ne]: 'failed' } },
      attributes: ['id', 'payment_number', 'customer_id', 'customer_name', 'amount', 'payment_date', 'status', 'mode', 'reference_number', 'created_at']
    });

    // Maps for customer calculations
    const customerInvoicedMap = {};
    const customerPaidMap     = {};
    const customerLastPaymentMap = {};

    orders.forEach(o => {
      const cid = o.party_id;
      if (cid) {
        customerInvoicedMap[cid] = (customerInvoicedMap[cid] || 0) + parseFloat(o.grand_total || 0);
      }
    });

    payments.forEach(p => {
      const cid = p.customer_id;
      if (cid && p.status === 'received') {
        const amt = parseFloat(p.amount || 0);
        customerPaidMap[cid] = (customerPaidMap[cid] || 0) + amt;

        if (!customerLastPaymentMap[cid] || new Date(p.payment_date) > new Date(customerLastPaymentMap[cid])) {
          customerLastPaymentMap[cid] = p.payment_date;
        }
      }
    });

    // Build customer outstandings list
    const customerOutstandings = customers.map(c => {
      const totalInvoiced = Math.round(customerInvoicedMap[c.id] || 0);
      const totalPaid     = Math.round(customerPaidMap[c.id] || 0);
      const balance       = totalInvoiced - totalPaid;
      const creditLimit   = parseFloat(c.credit_limit || 0);
      const isBreached    = creditLimit > 0 && balance > creditLimit;

      return {
        id: c.id,
        company_name: c.company_name,
        gst: c.gst,
        sales_manager_name: c.salesManager?.name || 'Unassigned',
        credit_limit: creditLimit,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        balance,
        is_breached: isBreached,
        last_payment_date: customerLastPaymentMap[c.id] || null,
        status: balance <= 0 ? 'CLEARED' : isBreached ? 'CREDIT_BREACH' : 'OUTSTANDING'
      };
    }).sort((a, b) => b.balance - a.balance);

    // 4. Calculate Daywise Accounts
    const dayMap = {};

    orders.forEach(o => {
      const day = (o.order_date || o.created_at?.toISOString() || '').slice(0, 10);
      if (!day) return;
      if (!dayMap[day]) dayMap[day] = { date: day, invoiced: 0, collected: 0, ordersCount: 0, paymentsCount: 0 };
      dayMap[day].invoiced += parseFloat(o.grand_total || 0);
      dayMap[day].ordersCount += 1;
    });

    payments.forEach(p => {
      const day = (p.payment_date || p.created_at?.toISOString() || '').slice(0, 10);
      if (!day) return;
      if (!dayMap[day]) dayMap[day] = { date: day, invoiced: 0, collected: 0, ordersCount: 0, paymentsCount: 0 };
      if (p.status === 'received') {
        dayMap[day].collected += parseFloat(p.amount || 0);
      }
      dayMap[day].paymentsCount += 1;
    });

    // Sort dates ascending for running calculation
    const sortedDays = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    let accumOutstanding = 0;
    const daywiseAccounts = sortedDays.map(d => {
      const invoiced  = Math.round(d.invoiced);
      const collected = Math.round(d.collected);
      const netChange = invoiced - collected;
      accumOutstanding += netChange;

      return {
        date: d.date,
        invoiced,
        collected,
        netChange,
        runningOutstanding: Math.max(0, accumOutstanding),
        ordersCount: d.ordersCount,
        paymentsCount: d.paymentsCount,
      };
    }).reverse(); // Most recent day first for display

    // Summary KPIs
    const totalOutstanding = customerOutstandings.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCollected = daywiseAccounts.find(d => d.date === todayStr)?.collected || 0;
    const breachedCount  = customerOutstandings.filter(c => c.is_breached).length;
    const activeDebtorsCount = customerOutstandings.filter(c => c.balance > 0).length;

    res.json({
      success: true,
      data: {
        outstandings: customerOutstandings,
        daywiseAccounts,
        summary: {
          totalOutstanding,
          todayCollected,
          breachedCount,
          activeDebtorsCount,
          totalCustomers: customers.length,
        }
      }
    });
  } catch (err) { next(err); }
};

// ── GET /api/v1/payments/ledger/:partyId ──────────────────────────────────────
exports.getPartyLedger = async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const customer = await Customer.findByPk(partyId, {
      include: [{ model: User, as: 'salesManager', attributes: ['name'] }]
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const orders = await Order.findAll({
      where: { party_id: partyId, status: { [Op.ne]: 'CANCELLED' } },
      order: [['order_date', 'ASC']]
    });

    const payments = await Payment.findAll({
      where: { customer_id: partyId, status: 'received' },
      order: [['payment_date', 'ASC']]
    });

    const raw = [];

    orders.forEach(o => {
      raw.push({
        id: `inv-${o.id}`,
        date: o.order_date || o.created_at,
        type: 'INVOICE',
        reference: o.challan_number ? `Challan #${o.challan_number}` : `Order #${o.order_number}`,
        debit: parseFloat(o.grand_total || 0),
        credit: 0,
        remarks: `Sales Order #${o.order_number}`
      });
    });

    payments.forEach(p => {
      raw.push({
        id: `pay-${p.id}`,
        date: p.payment_date || p.created_at,
        type: 'PAYMENT',
        reference: p.payment_number || `PAY #${p.id}`,
        debit: 0,
        credit: parseFloat(p.amount || 0),
        remarks: `${p.mode} - Ref: ${p.reference_number || '—'} (${p.remarks || ''})`
      });
    });

    raw.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    const ledger = raw.map(tx => {
      running += (tx.debit - tx.credit);
      return {
        ...tx,
        runningBalance: Math.round(running)
      };
    }).reverse();

    const totalInvoiced = orders.reduce((s, o) => s + parseFloat(o.grand_total || 0), 0);
    const totalPaid     = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const currentBalance = totalInvoiced - totalPaid;

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          company_name: customer.company_name,
          gst: customer.gst,
          credit_limit: parseFloat(customer.credit_limit || 0),
          sales_manager_name: customer.salesManager?.name || 'Unassigned'
        },
        summary: {
          totalInvoiced,
          totalPaid,
          currentBalance,
        },
        ledger
      }
    });
  } catch (err) { next(err); }
};

// ── PUT /api/v1/payments/:id ──────────────────────────────────────────────────
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, mode, reference_number, status, remarks, edit_reason } = req.body;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    if (!edit_reason || !edit_reason.trim()) {
      return res.status(400).json({ success: false, error: 'Edit reason is required for updating payment entries' });
    }

    const previousAmount = parseFloat(payment.amount || 0);
    const newAmount = amount != null ? parseFloat(amount) : previousAmount;

    // Calculate updated outstanding for customer
    let netBalanceBefore = 0;
    let netBalanceAfter = 0;
    if (payment.customer_id) {
      const orders = await Order.findAll({ where: { party_id: payment.customer_id, status: { [Op.ne]: 'CANCELLED' } } });
      const pastPayments = await Payment.findAll({ where: { customer_id: payment.customer_id, status: 'received' } });
      const totalInvoiced = orders.reduce((s, o) => s + parseFloat(o.grand_total || 0), 0);
      const totalPaidOther = pastPayments.filter(p => p.id !== payment.id).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      netBalanceBefore = Math.max(0, totalInvoiced - totalPaidOther - previousAmount);
      netBalanceAfter = Math.max(0, totalInvoiced - totalPaidOther - newAmount);
    }

    const isPartial = netBalanceAfter > 0;
    const paymentType = isPartial ? 'Partial Payment' : 'Full Settlement';

    const changedFields = {};
    if (amount != null && parseFloat(amount) !== previousAmount) {
      changedFields.amount = { from: previousAmount, to: newAmount };
      changedFields.payment_type = { from: 'N/A', to: paymentType };
      changedFields.remaining_outstanding = { from: netBalanceBefore, to: netBalanceAfter };
    }
    if (payment_date && payment_date !== payment.payment_date) {
      changedFields.payment_date = { from: payment.payment_date, to: payment_date };
    }
    if (mode && mode !== payment.mode) {
      changedFields.mode = { from: payment.mode, to: mode };
    }
    if (reference_number !== undefined && reference_number !== payment.reference_number) {
      changedFields.reference_number = { from: payment.reference_number || '', to: reference_number || '' };
    }
    if (status && status !== payment.status) {
      changedFields.status = { from: payment.status, to: status };
    }
    if (remarks !== undefined && remarks !== payment.remarks) {
      changedFields.remarks = { from: payment.remarks || '', to: remarks || '' };
    }

    await payment.update({
      amount: newAmount,
      payment_date: payment_date || payment.payment_date,
      mode: mode || payment.mode,
      reference_number: reference_number !== undefined ? reference_number : payment.reference_number,
      status: status || payment.status,
      remarks: remarks !== undefined ? remarks : payment.remarks,
    });

    await PaymentEditLog.create({
      payment_id: payment.id,
      edited_by: req.user?.name || 'System Admin',
      edit_reason: `${edit_reason.trim()} (${paymentType} — Balance remaining: ₹${netBalanceAfter.toLocaleString('en-IN')})`,
      previous_amount: previousAmount,
      new_amount: newAmount,
      changed_fields: changedFields,
    });

    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: PaymentEditLog, as: 'editLogs' },
      ],
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment,
    });
  } catch (err) { next(err); }
};

// ── GET /api/v1/payments/:id/edit-history ──────────────────────────────────────
exports.getPaymentEditHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await PaymentEditLog.findAll({
      where: { payment_id: id },
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) { next(err); }
};

