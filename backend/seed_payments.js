const { sequelize, Payment, Customer, User } = require('./models');

async function seedPayments() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');

    // Fetch real customers and users from DB
    const customers = await Customer.findAll({ attributes: ['id', 'company_name'], limit: 20 });
    const users = await User.findAll({ attributes: ['id', 'name', 'login_id'] });

    if (customers.length === 0) {
      console.log('No customers found. Please seed customers first.');
      process.exit(1);
    }

    const adminUser = users.find(u => u.login_id === 'admin') || users[0];
    const smUsers = users.filter(u => u.login_id.startsWith('sm_'));

    // Map of customer id → company name
    const custMap = {};
    customers.forEach(c => { custMap[c.id] = c.company_name; });

    const modes = ['UPI', 'RTGS', 'CASH', 'CHEQUE', 'NEFT', 'CARD'];
    const statuses = ['received', 'received', 'received', 'received', 'pending', 'failed'];

    // Generate a realistic payment number
    let payCounter = 1001;
    const genPayNo = () => `PAY-${payCounter++}`;

    // Generate a date offset from today
    const daysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };

    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickAmount = () => {
      const brackets = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000];
      return pickRandom(brackets);
    };

    // Build payment entries — mix of admin-recorded and SM-recorded
    const paymentEntries = [
      // --- Admin recorded payments (bulk settlements) ---
      { customer: customers[0], receivedBy: adminUser.name, daysAgo: 1,  mode: 'RTGS',   status: 'received', amount: 75000,  ref: 'RTGS202607280001', remarks: 'Full settlement July batch' },
      { customer: customers[1], receivedBy: adminUser.name, daysAgo: 2,  mode: 'CHEQUE', status: 'received', amount: 50000,  ref: 'CHQ-001234',        remarks: 'Cheque cleared' },
      { customer: customers[2], receivedBy: adminUser.name, daysAgo: 3,  mode: 'NEFT',   status: 'received', amount: 30000,  ref: 'NEFT20260725XYZ',   remarks: null },
      { customer: customers[3], receivedBy: adminUser.name, daysAgo: 4,  mode: 'RTGS',   status: 'received', amount: 100000, ref: 'RTGS2026072499',     remarks: 'Quarterly settlement' },
      { customer: customers[4], receivedBy: adminUser.name, daysAgo: 5,  mode: 'CASH',   status: 'received', amount: 20000,  ref: null,                remarks: 'Cash collected at office' },
      { customer: customers[5], receivedBy: adminUser.name, daysAgo: 7,  mode: 'UPI',    status: 'received', amount: 15000,  ref: 'UPI-78923462',       remarks: null },
      { customer: customers[6], receivedBy: adminUser.name, daysAgo: 8,  mode: 'RTGS',   status: 'pending',  amount: 40000,  ref: 'RTGS-PENDING-001',   remarks: 'Awaiting bank confirmation' },
      { customer: customers[7], receivedBy: adminUser.name, daysAgo: 10, mode: 'CHEQUE', status: 'failed',   amount: 25000,  ref: 'CHQ-BOUNCE-001',     remarks: 'Cheque bounced - reissue requested' },
      { customer: customers[0], receivedBy: adminUser.name, daysAgo: 12, mode: 'NEFT',   status: 'received', amount: 60000,  ref: 'NEFT2026071501',     remarks: null },
      { customer: customers[1], receivedBy: adminUser.name, daysAgo: 15, mode: 'RTGS',   status: 'received', amount: 80000,  ref: 'RTGS2026071201',     remarks: 'Mid-month settlement' },
      { customer: customers[2], receivedBy: adminUser.name, daysAgo: 18, mode: 'CASH',   status: 'received', amount: 10000,  ref: null,                remarks: 'Partial cash payment' },
      { customer: customers[3], receivedBy: adminUser.name, daysAgo: 20, mode: 'UPI',    status: 'received', amount: 35000,  ref: 'UPI-3490012',        remarks: null },
      { customer: customers[8] || customers[0], receivedBy: adminUser.name, daysAgo: 22, mode: 'RTGS', status: 'received', amount: 90000, ref: 'RTGS202607060099', remarks: 'Large order settlement' },
      { customer: customers[9] || customers[1], receivedBy: adminUser.name, daysAgo: 25, mode: 'CHEQUE', status: 'received', amount: 45000, ref: 'CHQ-009821', remarks: null },

      // --- SM Sree recorded payments ---
      ...(smUsers.find(u => u.login_id === 'sm_sree') ? [
        { customer: customers[0], receivedBy: smUsers.find(u => u.login_id === 'sm_sree').name, daysAgo: 1,  mode: 'UPI',  status: 'received', amount: 12000, ref: 'UPI-SM-001', remarks: 'Collected at customer site' },
        { customer: customers[2], receivedBy: smUsers.find(u => u.login_id === 'sm_sree').name, daysAgo: 3,  mode: 'CASH', status: 'received', amount: 8000,  ref: null,         remarks: null },
        { customer: customers[4], receivedBy: smUsers.find(u => u.login_id === 'sm_sree').name, daysAgo: 5,  mode: 'UPI',  status: 'pending',  amount: 5000,  ref: 'UPI-SM-002', remarks: 'Customer promised payment' },
        { customer: customers[1], receivedBy: smUsers.find(u => u.login_id === 'sm_sree').name, daysAgo: 8,  mode: 'CASH', status: 'received', amount: 15000, ref: null,         remarks: 'Monthly collection' },
        { customer: customers[3], receivedBy: smUsers.find(u => u.login_id === 'sm_sree').name, daysAgo: 12, mode: 'UPI',  status: 'received', amount: 20000, ref: 'UPI-SM-003', remarks: null },
      ] : []),

      // --- SM Priya Nair recorded payments ---
      ...(smUsers.find(u => u.login_id === 'sm_priya') ? [
        { customer: customers[5], receivedBy: smUsers.find(u => u.login_id === 'sm_priya').name, daysAgo: 2,  mode: 'UPI',  status: 'received', amount: 18000, ref: 'UPI-PN-001', remarks: null },
        { customer: customers[6], receivedBy: smUsers.find(u => u.login_id === 'sm_priya').name, daysAgo: 4,  mode: 'CASH', status: 'received', amount: 7500,  ref: null,         remarks: 'Partial payment' },
        { customer: customers[7], receivedBy: smUsers.find(u => u.login_id === 'sm_priya').name, daysAgo: 9,  mode: 'NEFT', status: 'received', amount: 22000, ref: 'NEFT-PN-001', remarks: null },
        { customer: customers[5], receivedBy: smUsers.find(u => u.login_id === 'sm_priya').name, daysAgo: 14, mode: 'UPI',  status: 'failed',   amount: 10000, ref: 'UPI-PN-FAIL', remarks: 'Payment failed, retry scheduled' },
      ] : []),

      // --- SM Anand Reddy recorded payments ---
      ...(smUsers.find(u => u.login_id === 'sm_anand') ? [
        { customer: customers[8] || customers[0], receivedBy: smUsers.find(u => u.login_id === 'sm_anand').name, daysAgo: 1,  mode: 'CASH', status: 'received', amount: 11000, ref: null,          remarks: 'Collection visit' },
        { customer: customers[9] || customers[1], receivedBy: smUsers.find(u => u.login_id === 'sm_anand').name, daysAgo: 6,  mode: 'UPI',  status: 'received', amount: 27000, ref: 'UPI-AR-001',  remarks: null },
        { customer: customers[2],                 receivedBy: smUsers.find(u => u.login_id === 'sm_anand').name, daysAgo: 11, mode: 'UPI',  status: 'pending',  amount: 9000,  ref: 'UPI-AR-002',  remarks: 'Pending from yesterday' },
      ] : []),

      // -- Additional older payments for history --
      { customer: customers[0], receivedBy: adminUser.name, daysAgo: 30, mode: 'RTGS',   status: 'received', amount: 120000, ref: 'RTGS2026062801', remarks: 'June end settlement' },
      { customer: customers[1], receivedBy: adminUser.name, daysAgo: 32, mode: 'CHEQUE', status: 'received', amount: 55000,  ref: 'CHQ-007700',      remarks: null },
      { customer: customers[3], receivedBy: adminUser.name, daysAgo: 35, mode: 'NEFT',   status: 'received', amount: 70000,  ref: 'NEFT2026062501',  remarks: 'Pre month closure' },
      { customer: customers[5], receivedBy: adminUser.name, daysAgo: 40, mode: 'CASH',   status: 'received', amount: 25000,  ref: null,              remarks: null },
      { customer: customers[6], receivedBy: adminUser.name, daysAgo: 45, mode: 'UPI',    status: 'received', amount: 33000,  ref: 'UPI-JUNE-001',    remarks: null },
      { customer: customers[4], receivedBy: adminUser.name, daysAgo: 50, mode: 'RTGS',   status: 'received', amount: 88000,  ref: 'RTGS2026060801',  remarks: 'May end collection' },
      { customer: customers[7], receivedBy: adminUser.name, daysAgo: 55, mode: 'CHEQUE', status: 'received', amount: 42000,  ref: 'CHQ-006600',      remarks: null },
      { customer: customers[0], receivedBy: adminUser.name, daysAgo: 60, mode: 'NEFT',   status: 'received', amount: 65000,  ref: 'NEFT2026052801',  remarks: 'May settlement' },
    ];

    let created = 0;
    for (const entry of paymentEntries) {
      if (!entry.customer) continue;

      // Avoid true duplicates by checking (customer_id + payment_date + amount)
      const payDate = daysAgo(entry.daysAgo);
      const existing = await Payment.findOne({
        where: {
          customer_id: entry.customer.id,
          payment_date: payDate,
          amount: entry.amount
        }
      });
      if (existing) {
        console.log(`  Skipping duplicate: ${entry.customer.company_name} ₹${entry.amount} on ${payDate}`);
        continue;
      }

      await Payment.create({
        payment_number: genPayNo(),
        customer_id: entry.customer.id,
        customer_name: entry.customer.company_name,
        amount: entry.amount,
        payment_date: payDate,
        mode: entry.mode,
        reference_number: entry.ref || null,
        status: entry.status,
        received_by: entry.receivedBy,
        remarks: entry.remarks || null,
      });

      console.log(`  ✓ ${entry.status.toUpperCase()} ₹${entry.amount.toLocaleString()} from ${entry.customer.company_name} via ${entry.mode} (by ${entry.receivedBy})`);
      created++;
    }

    console.log(`\n✅ Done! ${created} payment records seeded.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding payments:', err.message || err);
    process.exit(1);
  }
}

seedPayments();
