const { sequelize, Product, StockOnHand, StockTransaction, User } = require('./models');

async function seedStockMovementData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const adminUser = await User.findOne({ where: { login_id: 'admin' } }) || await User.findOne();
    const userId = adminUser ? adminUser.id : 1;

    // Define realistic stock movement parts dataset
    const sampleParts = [
      // --- Slow Movers (45-90 days) ---
      { sku: '5586608', name: 'HEAD CYLINDER', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 5, dlPrice: 54867.64, lastSoldDays: 62 },
      { sku: '5257639', name: 'KIT, ENGINE PISTON', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 11, dlPrice: 19919.58, lastSoldDays: 78 },
      { sku: '5363644', name: 'HEAD CYLINDER', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 4, dlPrice: 53540.14, lastSoldDays: 55 },
      { sku: '5263220', name: 'ALTERNATOR 24V 55A', supplier: 'CUMMINS 2S', planner: 'LUCAS', stock: 15, dlPrice: 12236.60, lastSoldDays: 82 },
      { sku: '3918562', name: 'HOSE FLEXIBLE HIGH TEMP', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 21, dlPrice: 8693.06, lastSoldDays: 48 },
      { sku: '3938156', name: 'GASKET GEAR HOUSING', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 25, dlPrice: 5455.14, lastSoldDays: 70 },
      { sku: 'FLT-AIR-002', name: 'HEAVY DUTY AIR FILTER - TYPE A', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 120, dlPrice: 850.00, lastSoldDays: 65 },
      { sku: 'BOSCH-INJ-009', name: 'FUEL INJECTOR NOZZLE KIT', supplier: 'BOSCH AUTOMOTIVE', planner: 'LUCAS', stock: 18, dlPrice: 4200.00, lastSoldDays: 85 },
      { sku: 'MINDA-SW-044', name: 'IGNITION SWITCH ASSEMBLY', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 45, dlPrice: 1350.00, lastSoldDays: 52 },
      { sku: 'LUCAS-STR-012', name: 'STARTER MOTOR 12V 2.2KW', supplier: 'LUCAS TVS', planner: 'LUCAS', stock: 8, dlPrice: 14500.00, lastSoldDays: 74 },

      // --- At Risk (90-180 days) ---
      { sku: '3973114', name: 'WATER PUMP ASSEMBLY', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 14, dlPrice: 18500.00, lastSoldDays: 110 },
      { sku: '4934862', name: 'CRANKSHAFT OIL SEAL REAR', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 32, dlPrice: 3800.00, lastSoldDays: 145 },
      { sku: 'FLT-OIL-001', name: 'PREMIUM OIL FILTER TYPE B', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 95, dlPrice: 420.00, lastSoldDays: 105 },
      { sku: 'MINDA-HL-088', name: 'HEADLAMP ASSEMBLY DUAL BEAM', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 22, dlPrice: 5600.00, lastSoldDays: 160 },
      { sku: 'LUCAS-ALT-005', name: 'HEAVY DUTY ALTERNATOR 28V', supplier: 'LUCAS TVS', planner: 'LUCAS', stock: 9, dlPrice: 21000.00, lastSoldDays: 130 },

      // --- Dead Stock (> 180 days or Never Sold) ---
      { sku: '4089731', name: 'TURBOCHARGER CORE KIT', supplier: 'CUMMINS 2S', planner: 'TCL', stock: 6, dlPrice: 65000.00, lastSoldDays: null },
      { sku: '4955160', name: 'CAMSHAFT BUSHING SET', supplier: 'CUMMINS 2S', planner: 'MDC', stock: 40, dlPrice: 2200.00, lastSoldDays: 220 },
      { sku: 'BRK-PAD-003', name: 'HEAVY DUTY BRAKE PADS', supplier: 'BOSCH AUTOMOTIVE', planner: 'SM-01', stock: 75, dlPrice: 1200.00, lastSoldDays: null },
      { sku: 'SKU-001', name: 'STANDARD BUSHING CLAMP', supplier: 'TCL SPARES', planner: 'TCL', stock: 200, dlPrice: 150.00, lastSoldDays: 250 },
      { sku: 'MINDA-RLY-002', name: 'POWER RELAY 24V 40A', supplier: 'MINDA INDUSTRIES', planner: 'TCL', stock: 110, dlPrice: 350.00, lastSoldDays: null },
    ];

    const today = new Date('2026-07-28');

    let seededProducts = 0;
    let seededTransactions = 0;

    for (const item of sampleParts) {
      // Find or create Product
      let [product, created] = await Product.findOrCreate({
        where: { sku: item.sku },
        defaults: {
          name: item.name,
          sku: item.sku,
          purchase_price: (item.dlPrice * 0.75).toFixed(2),
          dealer_landing_price: item.dlPrice.toFixed(2),
          selling_price: (item.dlPrice * 1.25).toFixed(2),
          reorder_threshold: 10,
          planner: item.planner,
          supplier: item.supplier,
          location: 'MAIN-WH-A1',
        }
      });

      if (!created) {
        await product.update({
          name: item.name,
          dealer_landing_price: item.dlPrice.toFixed(2),
          planner: item.planner,
          supplier: item.supplier,
        });
      }

      // Update StockOnHand
      let [stockRecord] = await StockOnHand.findOrCreate({
        where: { product_id: product.id },
        defaults: { quantity: item.stock }
      });
      await stockRecord.update({ quantity: item.stock });

      // Create Stock Transaction History if not already created
      const existingTx = await StockTransaction.findOne({ where: { product_id: product.id } });
      if (!existingTx) {
        // Initial Stock Inward 180 days ago
        const inwardDate = new Date(today);
        inwardDate.setDate(inwardDate.getDate() - 300);

        await StockTransaction.create({
          product_id: product.id,
          type: 'stock_in',
          reference: `PO-2025-INIT-${product.id}`,
          quantity_change: item.stock + 10,
          quantity_after: item.stock + 10,
          unit_cost: item.dlPrice,
          performed_by: userId,
          notes: 'Initial warehouse stocking',
          created_at: inwardDate,
        });

        // Last sale transaction if applicable
        if (item.lastSoldDays !== null) {
          const saleDate = new Date(today);
          saleDate.setDate(saleDate.getDate() - item.lastSoldDays);

          await StockTransaction.create({
            product_id: product.id,
            type: 'dispatch',
            reference: `ORD-2026-LAST-${product.id}`,
            quantity_change: -10,
            quantity_after: item.stock,
            unit_cost: item.dlPrice,
            performed_by: userId,
            notes: 'Customer dispatch order',
            created_at: saleDate,
          });
          seededTransactions += 2;
        } else {
          seededTransactions += 1;
        }
      }

      seededProducts++;
    }

    console.log(`\n✅ Done! Seeded ${seededProducts} products and ${seededTransactions} stock transaction logs.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding stock movement data:', err.message || err);
    process.exit(1);
  }
}

seedStockMovementData();
