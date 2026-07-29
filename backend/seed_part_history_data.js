const {
  sequelize,
  User,
  Product,
  ProductCategory,
  UnitOfMeasure,
  StockOnHand,
  Vendor,
  Customer,
  Region,
  InwardEntry,
  InwardItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Order,
  OrderItem,
  Challan,
  StockTransaction
} = require('./models');

async function seedPartHistoryData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to Database successfully.');

    // 1. Ensure basic Category & UOM
    const [category] = await ProductCategory.findOrCreate({
      where: { name: 'Auto Spare Parts' },
      defaults: { description: 'Vehicle spare parts and consumables' }
    });

    const [uom] = await UnitOfMeasure.findOrCreate({
      where: { code: 'PCS' },
      defaults: { name: 'Pieces' }
    });

    // 2. Ensure Region & Users
    const [region] = await Region.findOrCreate({
      where: { code: 'DEF' },
      defaults: { name: 'Default Region' }
    });

    let user = await User.findOne({ where: { login_id: 'admin' } })
      || await User.findOne({ where: { login_id: 'sm_sree' } })
      || await User.findOne();

    if (!user) {
      console.log('No user found, creating dummy admin user...');
      user = await User.create({
        name: 'System Admin',
        login_id: 'admin',
        email: 'admin@trackflow.local',
        password_hash: '$2b$10$xyzDummyHashValueForSeedingPurposesOnly',
        role_id: 1,
        status: 'ACTIVE'
      });
    }

    // 3. Ensure Vendors
    const vendorNames = [
      'Bosch Automotive Components',
      'Denso Auto Solutions',
      'Brembo Brakes India',
      'TVS Motor Parts'
    ];
    const vendors = {};
    for (const vName of vendorNames) {
      const [v] = await Vendor.findOrCreate({
        where: { company_name: vName },
        defaults: {
          company_name: vName,
          gst: '27AABCV' + Math.floor(1000 + Math.random() * 9000) + 'A1Z1'
        }
      });
      vendors[vName] = v;
    }

    // 4. Ensure Customers
    const customerNames = [
      'Verma Enterprises Pvt Ltd',
      'Gupta Traders',
      'Apex Logistics & Fleet',
      'Metro Motors'
    ];
    const customers = {};
    for (const cName of customerNames) {
      const [c] = await Customer.findOrCreate({
        where: { company_name: cName },
        defaults: {
          company_name: cName,
          gst: '27AADCV' + Math.floor(1000 + Math.random() * 9000) + 'C1Z1',
          sales_manager_id: user.id,
          region_id: region.id,
          credit_limit: 500000
        }
      });
      customers[cName] = c;
    }

    // 5. Parts Specification & Stock Target
    const partsData = [
      {
        sku: 'FLT-AIR-002',
        name: 'Heavy Duty Air Filter - Type A',
        supplier: 'Bosch Automotive Components',
        planner: 'FG-I',
        purchase_price: 450.00,
        selling_price: 750.00,
        targetStock: 120,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0101', supplier: 'Bosch Automotive Components', bill_number: 'INV-BOSCH-882', bill_date: '2026-05-10', qty: 150 }
          ],
          orders: [
            { order_number: 'ORD-2406-0099', challan_number: 'CHN-2406-0042', customer: 'Verma Enterprises Pvt Ltd', date: '2026-05-25', qty: 20 },
            { order_number: 'ORD-2406-0100', challan_number: 'CHN-2406-0043', customer: 'Gupta Traders', date: '2026-06-05', qty: 15 },
            { order_number: 'ORD-2407-0088', challan_number: 'CHN-2407-0088', customer: 'Apex Logistics & Fleet', date: '2026-07-10', qty: 50 }
          ],
          pos: [
            { po_number: 'PO-2026-0301', vendor: 'Bosch Automotive Components', date: '2026-06-20', qty: 50 }
          ],
          returns: [
            { reference: 'RET-2026-001', notes: 'Customer Return - Good Condition', date: '2026-06-12', qty: 5 }
          ]
        }
      },
      {
        sku: 'FLT-OIL-001',
        name: 'Spin-On Engine Oil Filter',
        supplier: 'Denso Auto Solutions',
        planner: 'FG-I',
        purchase_price: 280.00,
        selling_price: 480.00,
        targetStock: 85,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0102', supplier: 'Denso Auto Solutions', bill_number: 'INV-DENSO-301', bill_date: '2026-05-15', qty: 100 }
          ],
          orders: [
            { order_number: 'ORD-2406-0101', challan_number: 'CHN-2406-0050', customer: 'Metro Motors', date: '2026-06-01', qty: 25 },
            { order_number: 'ORD-2407-0092', challan_number: 'CHN-2407-0092', customer: 'Verma Enterprises Pvt Ltd', date: '2026-07-05', qty: 20 }
          ],
          pos: [
            { po_number: 'PO-2026-0302', vendor: 'Denso Auto Solutions', date: '2026-06-25', qty: 30 }
          ],
          returns: []
        }
      },
      {
        sku: 'BRK-PAD-003',
        name: 'Front Ceramic Brake Pads Set',
        supplier: 'Brembo Brakes India',
        planner: 'FG-II',
        purchase_price: 1200.00,
        selling_price: 1950.00,
        targetStock: 45,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0103', supplier: 'Brembo Brakes India', bill_number: 'INV-BREMBO-411', bill_date: '2026-04-18', qty: 60 }
          ],
          orders: [
            { order_number: 'ORD-2406-0102', challan_number: 'CHN-2406-0061', customer: 'Apex Logistics & Fleet', date: '2026-05-30', qty: 20 },
            { order_number: 'ORD-2407-0099', challan_number: 'CHN-2407-0099', customer: 'Gupta Traders', date: '2026-07-15', qty: 10 }
          ],
          pos: [
            { po_number: 'PO-2026-0303', vendor: 'Brembo Brakes India', date: '2026-06-18', qty: 15 }
          ],
          returns: []
        }
      },
      {
        sku: 'SKU-001',
        name: 'Premium Fuel Filter Element',
        supplier: 'TVS Motor Parts',
        planner: 'FG-I',
        purchase_price: 180.00,
        selling_price: 320.00,
        targetStock: 200,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0104', supplier: 'TVS Motor Parts', bill_number: 'INV-TVS-109', bill_date: '2026-05-01', qty: 250 }
          ],
          orders: [
            { order_number: 'ORD-2406-0103', challan_number: 'CHN-2406-0072', customer: 'Verma Enterprises Pvt Ltd', date: '2026-06-15', qty: 50 }
          ],
          pos: [],
          returns: []
        }
      },
      {
        sku: 'AX1006948',
        name: 'Drive Axle Shaft Assembly Heavy Duty',
        supplier: 'TVS Motor Parts',
        planner: 'FG-III',
        purchase_price: 4500.00,
        selling_price: 7200.00,
        targetStock: 18,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0105', supplier: 'TVS Motor Parts', bill_number: 'INV-TVS-404', bill_date: '2026-04-10', qty: 25 }
          ],
          orders: [
            { order_number: 'ORD-2406-0104', challan_number: 'CHN-2406-0080', customer: 'Apex Logistics & Fleet', date: '2026-05-20', qty: 10 },
            { order_number: 'ORD-2407-0105', challan_number: 'CHN-2407-0105', customer: 'Metro Motors', date: '2026-07-18', qty: 2 }
          ],
          pos: [
            { po_number: 'PO-2026-0304', vendor: 'TVS Motor Parts', date: '2026-06-30', qty: 5 }
          ],
          returns: []
        }
      },
      {
        sku: 'SPK-PLG-005',
        name: 'Iridium Power Spark Plug',
        supplier: 'Denso Auto Solutions',
        planner: 'FG-I',
        purchase_price: 95.00,
        selling_price: 160.00,
        targetStock: 350,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0106', supplier: 'Denso Auto Solutions', bill_number: 'INV-DENSO-902', bill_date: '2026-05-05', qty: 400 }
          ],
          orders: [
            { order_number: 'ORD-2406-0105', challan_number: 'CHN-2406-0088', customer: 'Gupta Traders', date: '2026-06-10', qty: 50 }
          ],
          pos: [],
          returns: []
        }
      },
      {
        sku: 'HYD-PMP-008',
        name: 'Hydraulic Gear Pump Assembly',
        supplier: 'Bosch Automotive Components',
        planner: 'FG-III',
        purchase_price: 8500.00,
        selling_price: 13500.00,
        targetStock: 12,
        history: {
          inwards: [
            { entry_number: 'INW-2026-0107', supplier: 'Bosch Automotive Components', bill_number: 'INV-BOSCH-1200', bill_date: '2026-04-05', qty: 15 }
          ],
          orders: [
            { order_number: 'ORD-2406-0106', challan_number: 'CHN-2406-0095', customer: 'Verma Enterprises Pvt Ltd', date: '2026-05-12', qty: 3 }
          ],
          pos: [],
          returns: []
        }
      }
    ];

    for (const item of partsData) {
      console.log(`Seeding part: ${item.sku} (${item.name})...`);

      // A. Create / Update Product
      const [product] = await Product.findOrCreate({
        where: { sku: item.sku },
        defaults: {
          name: item.name,
          category_id: category.id,
          uom_id: uom.id,
          supplier: item.supplier,
          planner: item.planner,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          reorder_threshold: 10
        }
      });

      // Update fields if product already existed
      product.name = item.name;
      product.supplier = item.supplier;
      product.planner = item.planner;
      product.purchase_price = item.purchase_price;
      product.selling_price = item.selling_price;
      await product.save();

      // B. Create / Update StockOnHand
      let stockOnHand = await StockOnHand.findOne({ where: { product_id: product.id } });
      if (!stockOnHand) {
        stockOnHand = await StockOnHand.create({
          product_id: product.id,
          quantity: item.targetStock
        });
      } else {
        stockOnHand.quantity = item.targetStock;
        await stockOnHand.save();
      }

      // C. Inward Entries
      for (const inv of item.history.inwards) {
        const [inwardEntry] = await InwardEntry.findOrCreate({
          where: { entry_number: inv.entry_number },
          defaults: {
            supplier_name: inv.supplier,
            bill_number: inv.bill_number,
            bill_date: inv.bill_date,
            received_by: user.id,
            notes: 'Seeded inward entry stock batch'
          }
        });

        await InwardItem.findOrCreate({
          where: {
            inward_entry_id: inwardEntry.id,
            product_id: product.id
          },
          defaults: {
            quantity_received: inv.qty
          }
        });
      }

      // D. Purchase Orders (POs)
      for (const po of item.history.pos) {
        const vendorObj = vendors[po.vendor] || Object.values(vendors)[0];
        const totalAmount = item.purchase_price * po.qty;
        const [purchaseOrder] = await PurchaseOrder.findOrCreate({
          where: { po_number: po.po_number },
          defaults: {
            invoice_number: 'INV-' + po.po_number,
            vendor_id: vendorObj ? vendorObj.id : null,
            vendor_name: po.vendor,
            po_date: po.date,
            status: 'SUBMITTED',
            subtotal: totalAmount,
            total: totalAmount,
            created_by: user.id
          }
        });

        await PurchaseOrderItem.findOrCreate({
          where: {
            purchase_order_id: purchaseOrder.id,
            part_number: item.sku
          },
          defaults: {
            product_id: product.id,
            description: item.name,
            unit_price: item.purchase_price,
            quantity: po.qty,
            total: totalAmount
          }
        });
      }

      // E. Sales Orders & Challans
      for (const ord of item.history.orders) {
        const customerObj = customers[ord.customer] || Object.values(customers)[0];
        const [order] = await Order.findOrCreate({
          where: { order_number: ord.order_number },
          defaults: {
            party_id: customerObj ? customerObj.id : null,
            customer_name: customerObj ? customerObj.company_name : ord.customer,
            company_name: customerObj ? customerObj.company_name : ord.customer,
            sales_manager_id: user.id,
            challan_number: ord.challan_number,
            status: 'DISPATCHED',
            order_date: ord.date,
            subtotal: item.selling_price * ord.qty,
            gst_amount: (item.selling_price * ord.qty) * 0.18,
            grand_total: (item.selling_price * ord.qty) * 1.18
          }
        });

        await OrderItem.findOrCreate({
          where: {
            order_id: order.id,
            product_id: product.id
          },
          defaults: {
            part_number: item.sku,
            description: item.name,
            quantity: ord.qty,
            base_price: item.selling_price,
            sm_price: item.selling_price,
            gst_percent: 18,
            line_total: item.selling_price * ord.qty
          }
        });

        if (ord.challan_number) {
          await Challan.findOrCreate({
            where: { challan_number: ord.challan_number },
            defaults: {
              order_id: order.id,
              party_id: customerObj ? customerObj.id : null,
              created_by: user.id,
              status: 'active'
            }
          });
        }
      }

      // F. Returns / Stock Transactions
      for (const ret of item.history.returns) {
        const existingTx = await StockTransaction.findOne({
          where: {
            product_id: product.id,
            reference: ret.reference
          }
        });

        if (!existingTx) {
          await StockTransaction.create({
            product_id: product.id,
            type: 'released',
            reference: ret.reference,
            quantity_change: ret.qty,
            quantity_after: item.targetStock,
            unit_cost: item.purchase_price,
            performed_by: user.id,
            notes: ret.notes,
            created_at: ret.date
          });
        }
      }
    }

    console.log('✅ Stock and transaction dummy data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding part history data:', err);
    process.exit(1);
  }
}

seedPartHistoryData();
