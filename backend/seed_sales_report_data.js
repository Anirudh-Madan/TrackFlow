const { sequelize, Order, OrderItem, Product, Customer, User } = require('./models');

async function seedSalesReportData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');

    const products = await Product.findAll({ limit: 15 });
    const customers = await Customer.findAll({ limit: 10 });
    const users = await User.findAll();

    const smUsers = users.filter(u => u.role_id === 2 || u.login_id.startsWith('sm_') || u.login_id === 'admin');
    if (products.length === 0 || customers.length === 0 || smUsers.length === 0) {
      console.log('Prerequisites missing.');
      process.exit(1);
    }

    const genOrderNo = (seq) => `ORD-2026-${String(seq).padStart(4, '0')}`;

    // Dates across June and July 2026
    const sampleDates = [
      '2026-07-28', '2026-07-27', '2026-07-26', '2026-07-25', '2026-07-24',
      '2026-07-22', '2026-07-20', '2026-07-18', '2026-07-15', '2026-07-12',
      '2026-07-10', '2026-07-08', '2026-07-05', '2026-07-02',
      '2026-06-28', '2026-06-25', '2026-06-20', '2026-06-15', '2026-06-10',
    ];

    let orderSeq = 101;
    let seededCount = 0;

    for (let i = 0; i < sampleDates.length; i++) {
      const orderDate = sampleDates[i];

      // Seed 2 to 3 orders per date
      for (let j = 0; j < 2; j++) {
        const cust = customers[(i + j) % customers.length];
        const sm = smUsers[(i + j) % smUsers.length];
        const orderNo = genOrderNo(orderSeq++);

        const existing = await Order.findOne({ where: { order_number: orderNo } });
        if (existing) continue;

        // Choose 2-3 items
        const item1 = products[(i * 2 + j) % products.length];
        const item2 = products[(i * 2 + j + 3) % products.length];

        const qty1 = Math.floor(Math.random() * 5) + 1;
        const qty2 = Math.floor(Math.random() * 4) + 1;

        const p1Price = parseFloat(item1.dealer_price || 450);
        const p2Price = parseFloat(item2.dealer_price || 650);

        const l1Total = qty1 * p1Price;
        const l2Total = qty2 * p2Price;

        const subtotal = l1Total + l2Total;
        const gstAmount = subtotal * 0.18;
        const grandTotal = subtotal + gstAmount;

        const order = await Order.create({
          order_number: orderNo,
          party_id: cust.id,
          supplier: 'TrackFlow Auto Spares',
          challan_number: `CHN-2026-${orderSeq}`,
          customer_name: cust.company_name,
          company_name: cust.company_name,
          customer_company: cust.company_name,
          sales_manager_id: sm.id,
          status: (j % 2 === 0) ? 'DISPATCHED' : 'APPROVED',
          order_date: orderDate,
          subtotal: subtotal.toFixed(2),
          gst_amount: gstAmount.toFixed(2),
          grand_total: grandTotal.toFixed(2),
          credit_hold: false,
        });

        await OrderItem.create({
          order_id: order.id,
          product_id: item1.id,
          part_number: item1.part_number,
          description: item1.name,
          dl_price: p1Price,
          quantity: qty1,
          base_price: p1Price,
          sm_price: p1Price,
          gst_percent: 18,
          line_total: l1Total.toFixed(2),
        });

        await OrderItem.create({
          order_id: order.id,
          product_id: item2.id,
          part_number: item2.part_number,
          description: item2.name,
          dl_price: p2Price,
          quantity: qty2,
          base_price: p2Price,
          sm_price: p2Price,
          gst_percent: 18,
          line_total: l2Total.toFixed(2),
        });

        seededCount++;
        console.log(`  ✓ Created Order ${orderNo} on ${orderDate} for ${cust.company_name} (₹${grandTotal.toFixed(2)}) by ${sm.name}`);
      }
    }

    console.log(`\n✅ Done! ${seededCount} sales orders seeded successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding sales report data:', err.message || err);
    process.exit(1);
  }
}

seedSalesReportData();
