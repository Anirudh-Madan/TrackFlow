const { sequelize, User, Customer, Order, OrderItem, Challan, Product, Region } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const smSree = await User.findOne({ where: { login_id: 'sm_sree' } });
    const smRavi = await User.findOne({ where: { login_id: 'sm_ravi' } });

    if (!smSree || !smRavi) {
      console.log('Users sm_sree or sm_ravi not found! Make sure they are created.');
      process.exit(1);
    }

    const products = await Product.findAll({ limit: 5 });
    if (products.length < 2) {
      console.log('Not enough products found for seeding.');
      process.exit(1);
    }

    const region = await Region.findOne() || await Region.create({ name: 'Default Region', code: 'DEF' });

    let customer1 = await Customer.findOne({ where: { company_name: 'Verma Enterprises Pvt Ltd' } });
    if (!customer1) {
      customer1 = await Customer.create({
        company_name: 'Verma Enterprises Pvt Ltd',
        gst: '27AADCV1122C1Z1',
        sales_manager_id: smSree.id,
        region_id: region.id,
        credit_limit: 500000
      });
    }

    let customer2 = await Customer.findOne({ where: { company_name: 'Gupta Traders' } });
    if (!customer2) {
      customer2 = await Customer.create({
        company_name: 'Gupta Traders',
        gst: '09AAACG1234D1Z2',
        sales_manager_id: smRavi.id,
        region_id: region.id,
        credit_limit: 300000
      });
    }

    const ordersToCreate = [
      {
        sales_manager: smSree,
        customer: customer1,
        challan_number: 'CHN-2406-0042',
        order_number: 'ORD-2406-0099'
      },
      {
        sales_manager: smRavi,
        customer: customer2,
        challan_number: 'CHN-2406-0043',
        order_number: 'ORD-2406-0100'
      }
    ];

    for (const data of ordersToCreate) {
      // Check if order exists
      const existingOrder = await Order.findOne({ where: { order_number: data.order_number } });
      if (existingOrder) {
        console.log(`Order ${data.order_number} already exists, skipping...`);
        continue;
      }

      const order = await Order.create({
        order_number: data.order_number,
        party_id: data.customer.id,
        sales_manager_id: data.sales_manager.id,
        status: 'DISPATCHED',
        order_date: new Date(),
        subtotal: 1000,
        gst_amount: 180,
        grand_total: 1180
      });

      await OrderItem.create({
        order_id: order.id,
        product_id: products[0].id,
        quantity: 10,
        base_price: 50,
        sm_price: 50,
        gst_percent: 18,
        line_total: 500
      });

      await OrderItem.create({
        order_id: order.id,
        product_id: products[1].id,
        quantity: 10,
        base_price: 50,
        sm_price: 50,
        gst_percent: 18,
        line_total: 500
      });

      await Challan.create({
        challan_number: data.challan_number,
        order_id: order.id
      });
      console.log(`Created order ${data.order_number} and challan ${data.challan_number}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
