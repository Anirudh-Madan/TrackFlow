const { sequelize, User, Role, Vendor, Product, StockOnHand, Order, OrderItem, PurchaseOrder, PurchaseOrderItem, Challan } = require('./models');

async function seedSupplierReportData() {
  try {
    console.log('🌱 Starting Supplier Report Data Seeding...');
    await sequelize.authenticate();

    // 1. Ensure Sales Manager Roles & Users
    let smRole = await Role.findOne({ where: { name: 'sales_manager' } });
    if (!smRole) {
      smRole = await Role.create({ name: 'sales_manager', description: 'Sales Manager' });
    }

    let chandra = await User.findOne({ where: { name: 'Chandra Prakash' } });
    if (!chandra) {
      chandra = await User.create({
        login_id: 'chandra',
        name: 'Chandra Prakash',
        email: 'chandra@trackflow.com',
        password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW',
        role_id: smRole.id,
        is_active: true
      });
    }

    let deepak = await User.findOne({ where: { name: 'Deepak Prajapat' } });
    if (!deepak) {
      deepak = await User.create({
        login_id: 'deepak',
        name: 'Deepak Prajapat',
        email: 'deepak@trackflow.com',
        password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW',
        role_id: smRole.id,
        is_active: true
      });
    }

    let admin = await User.findOne({ where: { role_id: 1 } });
    if (!admin) admin = chandra;

    // 2. Create Vendors (Suppliers)
    const vendorNames = ['CCC', 'CUMMINS 2S', 'BOSCH INDIA', 'MAHLE SPARES', 'TATA AUTOCOMP'];
    const vendorMap = {};

    for (const vName of vendorNames) {
      let vendor = await Vendor.findOne({ where: { company_name: vName } });
      if (!vendor) {
        vendor = await Vendor.create({
          company_name: vName,
          vendor_code: `VEN-${vName.replace(/\s+/g, '')}`,
          contact_person: `${vName} Sales Rep`,
          email: `contact@${vName.toLowerCase().replace(/\s+/g, '')}.com`,
          phone_number: '9876543210',
          status: 'ACTIVE'
        });
      }
      vendorMap[vName] = vendor;
    }

    console.log('✅ Vendors ready:', Object.keys(vendorMap));

    // 3. Create Products for CCC (Matching user screenshot)
    const cccProductsData = [
      { sku: 'Q312536', name: 'GASKET', supplier: 'CCC', stockQty: 5, purchase_price: 5000, dealer_landing_price: 5500, selling_price: 15760 },
      { sku: 'CES90004', name: 'SEAL KIT', supplier: 'CCC', stockQty: 0, purchase_price: 2500, dealer_landing_price: 3200, selling_price: 8760 },
      { sku: 'CCC-9011', name: 'FILTER ELEMENT', supplier: 'CCC', stockQty: 12, purchase_price: 800, dealer_landing_price: 1000, selling_price: 2400 },
      { sku: 'CCC-4052', name: 'O-RING PACK', supplier: 'CCC', stockQty: 0, purchase_price: 200, dealer_landing_price: 300, selling_price: 750 }
    ];

    const productMap = {};

    for (const pData of cccProductsData) {
      let product = await Product.findOne({ where: { sku: pData.sku } });
      if (!product) {
        product = await Product.create({
          sku: pData.sku,
          name: pData.name,
          supplier: pData.supplier,
          vendor_id: vendorMap[pData.supplier].id,
          purchase_price: pData.purchase_price,
          dealer_landing_price: pData.dealer_landing_price,
          selling_price: pData.selling_price,
          reorder_threshold: 10
        });
      }
      productMap[pData.sku] = product;

      // Update or create StockOnHand
      let stock = await StockOnHand.findOne({ where: { product_id: product.id } });
      if (!stock) {
        await StockOnHand.create({ product_id: product.id, quantity: pData.stockQty, location: 'MAIN-WH' });
      } else {
        await stock.update({ quantity: pData.stockQty });
      }
    }

    // 4. Products for other suppliers
    const otherProducts = [
      { sku: 'AX1001399', name: 'LONG BLOCK 160HP INLINE-6', supplier: 'CUMMINS 2S', stockQty: 8, purchase_price: 120000, dealer_landing_price: 145500, selling_price: 165112 },
      { sku: 'BOSCH-0986', name: 'INJECTOR NOZZLE KIT', supplier: 'BOSCH INDIA', stockQty: 25, purchase_price: 4500, dealer_landing_price: 5200, selling_price: 7800 },
      { sku: 'MAHLE-7701', name: 'PISTON RING SET', supplier: 'MAHLE SPARES', stockQty: 18, purchase_price: 1800, dealer_landing_price: 2200, selling_price: 3500 }
    ];

    for (const pData of otherProducts) {
      let product = await Product.findOne({ where: { sku: pData.sku } });
      if (!product) {
        product = await Product.create({
          sku: pData.sku,
          name: pData.name,
          supplier: pData.supplier,
          vendor_id: vendorMap[pData.supplier]?.id || null,
          purchase_price: pData.purchase_price,
          dealer_landing_price: pData.dealer_landing_price,
          selling_price: pData.selling_price,
          reorder_threshold: 10
        });
      }
      productMap[pData.sku] = product;

      let stock = await StockOnHand.findOne({ where: { product_id: product.id } });
      if (!stock) {
        await StockOnHand.create({ product_id: product.id, quantity: pData.stockQty, location: 'MAIN-WH' });
      } else {
        await stock.update({ quantity: pData.stockQty });
      }
    }

    console.log('✅ Products & StockOnHand ready');

    // 5. Create Purchase Orders for CCC & Suppliers (July 2026)
    const poDates = ['2026-07-05', '2026-07-12', '2026-07-18', '2026-07-25'];

    for (let i = 0; i < poDates.length; i++) {
      const poDate = poDates[i];
      const poNum = `PO-CCC-2026-${100 + i}`;

      let po = await PurchaseOrder.findOne({ where: { po_number: poNum } });
      if (!po) {
        po = await PurchaseOrder.create({
          po_number: poNum,
          invoice_number: `INV-CCC-2026-${100 + i}`,
          vendor_id: vendorMap['CCC'].id,
          vendor_name: 'CCC',
          po_date: poDate,
          total: i % 2 === 0 ? 18960 : 18960,
          status: 'SUBMITTED',
          is_returned: false,
          created_by: admin.id,
          created_at: `${poDate} 10:00:00`
        });

        await PurchaseOrderItem.create({
          purchase_order_id: po.id,
          product_id: productMap['Q312536'].id,
          part_number: 'Q312536',
          quantity: 2,
          unit_cost: 5000,
          total_cost: 10000
        });

        await PurchaseOrderItem.create({
          purchase_order_id: po.id,
          product_id: productMap['CES90004'].id,
          part_number: 'CES90004',
          quantity: 2,
          unit_cost: 2500,
          total_cost: 5000
        });
      }
    }

    console.log('✅ Purchase Orders seeded for CCC');

    // 6. Create Orders & OrderItems matching Screenshot metrics
    // Total CCC Revenue = 37,920.00 (Chandra = 20,400.00, Deepak = 17,520.00)
    // Challans = 4 (Chandra 2, Deepak 2)

    // Order 1 (Chandra Prakash -> Q312536 qty 1, rev 20,400)
    const order1Num = `ORD-CCC-7401`;
    let order1 = await Order.findOne({ where: { order_number: order1Num } });
    if (!order1) {
      order1 = await Order.create({
        order_number: order1Num,
        challan_number: 'CH-7401',
        sales_manager_id: chandra.id,
        customer_name: 'RAMDEV MOTOR',
        customer_company: 'RAMDEV MOTOR',
        order_date: '2026-07-15',
        subtotal: 20400,
        gst_amount: 0,
        grand_total: 20400,
        status: 'APPROVED',
        created_at: '2026-07-15 11:00:00'
      });

      await OrderItem.create({
        order_id: order1.id,
        product_id: productMap['Q312536'].id,
        part_number: 'Q312536',
        description: 'GASKET',
        quantity: 2,
        sm_price: 10200,
        dl_price: 0, // profit = 20,400
        unit_price: 10200,
        total: 20400
      });
    }

    // Order 2 (Chandra Prakash -> CCC-9011)
    const order2Num = `ORD-CCC-7402`;
    let order2 = await Order.findOne({ where: { order_number: order2Num } });
    if (!order2) {
      order2 = await Order.create({
        order_number: order2Num,
        challan_number: 'CH-7402',
        sales_manager_id: chandra.id,
        customer_name: 'RAMDEV MOTOR',
        customer_company: 'RAMDEV MOTOR',
        order_date: '2026-07-18',
        subtotal: 11120,
        gst_amount: 0,
        grand_total: 11120,
        status: 'APPROVED',
        created_at: '2026-07-18 14:00:00'
      });

      await OrderItem.create({
        order_id: order2.id,
        product_id: productMap['Q312536'].id,
        part_number: 'Q312536',
        description: 'GASKET',
        quantity: 1,
        sm_price: 11120,
        dl_price: 0,
        unit_price: 11120,
        total: 11120
      });
    }

    // Order 3 (Deepak Prajapat -> CES90004 qty 2, rev 17,520)
    const order3Num = `ORD-CCC-7403`;
    let order3 = await Order.findOne({ where: { order_number: order3Num } });
    if (!order3) {
      order3 = await Order.create({
        order_number: order3Num,
        challan_number: 'CH-7403',
        sales_manager_id: deepak.id,
        customer_name: 'BHARAT DIESEL WORLD',
        customer_company: 'BHARAT DIESEL WORLD',
        order_date: '2026-07-20',
        subtotal: 17520,
        gst_amount: 0,
        grand_total: 17520,
        status: 'APPROVED',
        created_at: '2026-07-20 09:30:00'
      });

      await OrderItem.create({
        order_id: order3.id,
        product_id: productMap['CES90004'].id,
        part_number: 'CES90004',
        description: 'SEAL KIT',
        quantity: 2,
        sm_price: 8760,
        dl_price: 0, // profit = 17,520
        unit_price: 8760,
        total: 17520
      });
    }

    // Order 4 (Deepak Prajapat -> CES90004)
    const order4Num = `ORD-CCC-7404`;
    let order4 = await Order.findOne({ where: { order_number: order4Num } });
    if (!order4) {
      order4 = await Order.create({
        order_number: order4Num,
        challan_number: 'CH-7404',
        sales_manager_id: deepak.id,
        customer_name: 'MNR AUTO TRADERS',
        customer_company: 'MNR AUTO TRADERS',
        order_date: '2026-07-24',
        subtotal: 6400,
        gst_amount: 0,
        grand_total: 6400,
        status: 'APPROVED',
        created_at: '2026-07-24 16:00:00'
      });

      await OrderItem.create({
        order_id: order4.id,
        product_id: productMap['CES90004'].id,
        part_number: 'CES90004',
        description: 'SEAL KIT',
        quantity: 1,
        sm_price: 6400,
        dl_price: 0,
        unit_price: 6400,
        total: 6400
      });
    }

    console.log('✅ Sales Orders & OrderItems seeded matching CCC Report');
    console.log('🎉 SUPPLIER DUMMY DATA SEEDING COMPLETE SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seedSupplierReportData();
