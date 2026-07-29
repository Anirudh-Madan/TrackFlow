const { sequelize, Product, StockOnHand, Order, OrderItem, User } = require('./models');

async function seedProductsAndMovement() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const adminUser = await User.findOne({ where: { login_id: 'admin' } }) || await User.findOne();
    const userId = adminUser ? adminUser.id : 1;

    // 50 realistic spare parts dataset
    const catalogData = [
      // Cummins Parts
      { sku: '3955393', name: 'SEAL, VALVE STEM', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 36, dlPrice: 420.00, lastSoldDays: 15 },
      { sku: 'AX1016842', name: 'BRAKE LINING TS2 STD', supplier: 'CUMMINS 2S', planner: 'LOCALP', stock: 86, dlPrice: 1850.00, lastSoldDays: 55 },
      { sku: '3900589', name: 'NUT, HEXAGON FLANGE', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 564, dlPrice: 45.00, lastSoldDays: 10 },
      { sku: '5263672', name: 'PLUG, EXPANSION', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 1, dlPrice: 320.00, lastSoldDays: 78 },
      { sku: 'AX1016843', name: 'BRAKE LINING TS2 I/S', supplier: 'CUMMINS 2S', planner: 'LOCALP', stock: 154, dlPrice: 1950.00, lastSoldDays: 82 },
      { sku: '5288690', name: 'GASKET, EXHAUST MANIFOLD', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 288, dlPrice: 680.00, lastSoldDays: 20 },
      { sku: 'AX1015352', name: 'KIT, CARTRIDGE TURBO', supplier: 'CUMMINS 2S', planner: 'FG-I', stock: 21, dlPrice: 14500.00, lastSoldDays: 65 },
      { sku: 'SA1205HS006', name: 'HUB SEAL - TATA - REAR INNER', supplier: 'CUMMINS 2S', planner: 'OIL SEAL', stock: 56, dlPrice: 1250.00, lastSoldDays: 88 },
      { sku: '3942565', name: 'TAPPET, VALVE', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 204, dlPrice: 890.00, lastSoldDays: 25 },
      { sku: '5586608', name: 'HEAD CYLINDER HEAVY DUTY', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 5, dlPrice: 54867.64, lastSoldDays: 62 },
      { sku: '5257639', name: 'KIT, ENGINE PISTON ASSY', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 11, dlPrice: 19919.58, lastSoldDays: 78 },
      { sku: '5363644', name: 'HEAD CYLINDER DIESEL', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 4, dlPrice: 53540.14, lastSoldDays: 55 },
      { sku: '5263220', name: 'ALTERNATOR 24V 55A', supplier: 'CUMMINS 2S', planner: 'LUCAS', stock: 15, dlPrice: 12236.60, lastSoldDays: 82 },
      { sku: '3918562', name: 'HOSE FLEXIBLE HIGH TEMP', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 21, dlPrice: 8693.06, lastSoldDays: 48 },
      { sku: '3938156', name: 'GASKET GEAR HOUSING', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 25, dlPrice: 5455.14, lastSoldDays: 70 },
      { sku: '3973114', name: 'WATER PUMP ASSEMBLY', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 14, dlPrice: 18500.00, lastSoldDays: 110 },
      { sku: '4934862', name: 'CRANKSHAFT OIL SEAL REAR', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 32, dlPrice: 3800.00, lastSoldDays: 145 },
      { sku: '4089731', name: 'TURBOCHARGER CORE KIT', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 6, dlPrice: 65000.00, lastSoldDays: null },
      { sku: '4955160', name: 'CAMSHAFT BUSHING SET', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 40, dlPrice: 2200.00, lastSoldDays: 220 },

      // Bosch Parts
      { sku: 'FLT-AIR-002', name: 'HEAVY DUTY AIR FILTER - TYPE A', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 120, dlPrice: 850.00, lastSoldDays: 65 },
      { sku: 'BOSCH-INJ-009', name: 'FUEL INJECTOR NOZZLE KIT', supplier: 'BOSCH AUTOMOTIVE', planner: 'LUCAS', stock: 18, dlPrice: 4200.00, lastSoldDays: 85 },
      { sku: 'FLT-OIL-001', name: 'PREMIUM OIL FILTER TYPE B', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 95, dlPrice: 420.00, lastSoldDays: 105 },
      { sku: 'BRK-PAD-003', name: 'HEAVY DUTY BRAKE PADS', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 75, dlPrice: 1200.00, lastSoldDays: null },
      { sku: 'BOSCH-PLG-012', name: 'GLOW PLUG SET 4CYL', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 60, dlPrice: 1650.00, lastSoldDays: 30 },
      { sku: 'BOSCH-SEN-004', name: 'CRANKSHAFT POSITION SENSOR', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 14, dlPrice: 3400.00, lastSoldDays: 135 },

      // Minda Parts
      { sku: 'MINDA-SW-044', name: 'IGNITION SWITCH ASSEMBLY', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 45, dlPrice: 1350.00, lastSoldDays: 52 },
      { sku: 'MINDA-HL-088', name: 'HEADLAMP ASSEMBLY DUAL BEAM', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 22, dlPrice: 5600.00, lastSoldDays: 160 },
      { sku: 'MINDA-RLY-002', name: 'POWER RELAY 24V 40A', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 110, dlPrice: 350.00, lastSoldDays: null },
      { sku: 'MINDA-HN-005', name: 'DUAL HORN SET HIGH POWER', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 85, dlPrice: 780.00, lastSoldDays: 18 },

      // Lucas TVS Parts
      { sku: 'LUCAS-STR-012', name: 'STARTER MOTOR 12V 2.2KW', supplier: 'LUCAS TVS', planner: 'LUCAS', stock: 8, dlPrice: 14500.00, lastSoldDays: 74 },
      { sku: 'LUCAS-ALT-005', name: 'HEAVY DUTY ALTERNATOR 28V', supplier: 'LUCAS TVS', planner: 'LUCAS', stock: 9, dlPrice: 21000.00, lastSoldDays: 130 },
      { sku: 'LUCAS-WPR-001', name: 'WIPER MOTOR HEAVY TRUCK', supplier: 'LUCAS TVS', planner: 'LUCAS', stock: 30, dlPrice: 2850.00, lastSoldDays: 95 },

      // Meritor Parts
      { sku: 'SKITC11264', name: 'DIFF CASE ASSY - MD, MR-15i', supplier: 'Meritor', planner: 'LOCALP', stock: 12, dlPrice: 28500.00, lastSoldDays: 60 },
      { sku: 'MER-AXL-008', name: 'REAR AXLE SHAFT 39-SPLINE', supplier: 'Meritor', planner: 'LOCALP', stock: 8, dlPrice: 16400.00, lastSoldDays: 190 },
      { sku: 'MER-BRK-022', name: 'BRAKE DRUM REAR DUAL', supplier: 'Meritor', planner: 'LOCALP', stock: 16, dlPrice: 8900.00, lastSoldDays: 140 },

      // Eaton & TCL Spares
      { sku: 'ETN-CLT-001', name: 'CLUTCH DISC HEAVY DUTY 380MM', supplier: 'EATON', planner: 'FG-I', stock: 7, dlPrice: 24500.00, lastSoldDays: 72 },
      { sku: 'ETN-GR-014', name: 'GEAR 4TH SPEED COUNTERSHAFT', supplier: 'EATON', planner: 'FG-I', stock: 15, dlPrice: 7200.00, lastSoldDays: null },
      { sku: 'SKU-001', name: 'STANDARD BUSHING CLAMP', supplier: 'TCL SPARES', planner: 'TCL', stock: 200, dlPrice: 150.00, lastSoldDays: 250 },
    ];

    const refDate = new Date('2026-07-28');
    let seededCount = 0;

    for (const item of catalogData) {
      let [product, created] = await Product.findOrCreate({
        where: { sku: item.sku },
        defaults: {
          name: item.name,
          sku: item.sku,
          purchase_price: (item.dlPrice * 0.75).toFixed(2),
          dealer_landing_price: item.dlPrice.toFixed(2),
          selling_price: (item.dlPrice * 1.25).toFixed(2),
          reorder_threshold: Math.round(item.stock * 0.8),
          planner: item.planner,
          supplier: item.supplier,
          location: 'MAIN-WH-A1',
        }
      });

      // Always update details to stay consistent
      await product.update({
        name: item.name,
        dealer_landing_price: item.dlPrice.toFixed(2),
        planner: item.planner,
        supplier: item.supplier,
      });

      // Ensure StockOnHand record exists
      let [stockRecord] = await StockOnHand.findOrCreate({
        where: { product_id: product.id },
        defaults: { quantity: item.stock }
      });
      await stockRecord.update({ quantity: item.stock });

      // Seed Order / OrderItem for last sale if applicable
      if (item.lastSoldDays !== null) {
        const saleDateStr = new Date(refDate.getTime() - item.lastSoldDays * 86400000).toISOString().slice(0, 10);
        const orderNo = `ORD-MOVE-${product.id}`;

        let [order] = await Order.findOrCreate({
          where: { order_number: orderNo },
          defaults: {
            order_number: orderNo,
            sales_manager_id: userId,
            status: 'DISPATCHED',
            order_date: saleDateStr,
            subtotal: item.dlPrice * 2,
            gst_amount: item.dlPrice * 2 * 0.18,
            grand_total: item.dlPrice * 2 * 1.18,
            credit_hold: false,
          }
        });
        await order.update({ order_date: saleDateStr });

        let [orderItem] = await OrderItem.findOrCreate({
          where: { order_id: order.id, product_id: product.id },
          defaults: {
            order_id: order.id,
            product_id: product.id,
            description: item.name,
            dl_price: item.dlPrice,
            quantity: 2,
            base_price: item.dlPrice,
            sm_price: item.dlPrice,
            gst_percent: 18,
            line_total: (item.dlPrice * 2).toFixed(2),
          }
        });
      }

      seededCount++;
    }

    console.log(`\n✅ Success! Seeded ${seededCount} catalog products into Product table (visible at /admin/products & stock movement).`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding products and movement:', err.message || err);
    process.exit(1);
  }
}

seedProductsAndMovement();
