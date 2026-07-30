/**
 * TrackFlow — Sample Data Seeder
 * 
 * Inserts 10 rows each into all core tables so you can see how an
 * order request flows from SM → IM (approve) → DW (dispatch).
 *
 * Usage:
 *   node seed.js
 *
 * Safe to re-run: uses INSERT IGNORE / findOrCreate patterns.
 * Requires a running MySQL instance with the DB already migrated.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');

// ── models ────────────────────────────────────────────────────────────────────
const {
  Role, User, Region,
  ProductCategory, UnitOfMeasure, Product, Pricing,
  Customer,
  StockOnHand, StockReserved, StockDamaged, StockTransaction, InventoryAdjustment,
  InwardEntry, InwardItem,
  Order, OrderItem, OrderStatusHistory,
  Challan,
  FulfillmentOrder, PipelineTracking, PipelineItem, PipelineStageHistory,
  Notification, PartRequest,
  ReorderFlag,
} = require('./models');

// ── helpers ───────────────────────────────────────────────────────────────────
const NOW  = new Date();
const ago  = (days) => new Date(Date.now() - days * 86_400_000);
const hash = (pw)   => bcrypt.hashSync(pw, 10);

async function seed() {
  await sequelize.authenticate();
  console.log('✅  DB connected');

  // Ensure the schema (including newer tables like dispatch) exists before seeding.
  await sequelize.sync({ alter: true });
  console.log('✅  Schema synchronized');

  // ── 1. Roles ───────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding roles…');
  const roleDefs = [
    { name: 'admin',              display_name: 'Administrator',       description: 'Full system access' },
    { name: 'sales_manager',      display_name: 'Sales Manager',       description: 'Manages orders and customers' },
    { name: 'inventory_manager',  display_name: 'Inventory Manager',   description: 'Approves orders, manages stock' },
    { name: 'dispatch_worker',    display_name: 'Dispatch Worker',     description: 'Picks and dispatches orders' },
  ];
  const roles = {};
  for (const r of roleDefs) {
    const [row] = await Role.findOrCreate({ where: { name: r.name }, defaults: r });
    roles[r.name] = row;
  }
  console.log(`   roles: ${Object.keys(roles).join(', ')}`);

  // ── 2. Regions ─────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding regions…');
  const regionDefs = [
    { name: 'North Karnataka',    code: 'NK', description: 'Hubli, Dharwad, Belgaum belt' },
    { name: 'South Karnataka',    code: 'SK', description: 'Mysuru, Mandya, Hassan belt' },
    { name: 'Bengaluru Urban',    code: 'BU', description: 'Greater Bengaluru limits' },
    { name: 'Coastal Karnataka',  code: 'CK', description: 'Mangaluru, Udupi belt' },
    { name: 'Central Karnataka',  code: 'CEN', description: 'Davanagere, Chitradurga' },
    { name: 'Mumbai Metro',       code: 'MUM', description: 'Mumbai and Thane' },
    { name: 'Pune Region',        code: 'PNE', description: 'Pune and Pimpri-Chinchwad' },
    { name: 'Hyderabad Metro',    code: 'HYD', description: 'Hyderabad and Secunderabad' },
    { name: 'Chennai Metro',      code: 'CHN', description: 'Greater Chennai' },
    { name: 'NCR Delhi',          code: 'NCR', description: 'Delhi, Gurugram, Noida' },
  ];
  const regions = [];
  for (const r of regionDefs) {
    const [row] = await Region.findOrCreate({ where: { code: r.code }, defaults: r });
    regions.push(row);
  }
  console.log(`   ${regions.length} regions`);

  // ── 3. Users ───────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding users…');
  // 1 admin, 3 SMs, 3 IMs, 3 DWs = 10
  const userDefs = [
    { login_id: 'admin01',   name: 'Arjun Sharma',    role: 'admin',             region: regions[2], phone: '9900001001' },
    { login_id: 'sm_ravi',   name: 'Ravi Kumar',      role: 'sales_manager',     region: regions[0], phone: '9900001002' },
    { login_id: 'sm_priya',  name: 'Priya Nair',      role: 'sales_manager',     region: regions[1], phone: '9900001003' },
    { login_id: 'sm_anand',  name: 'Anand Reddy',     role: 'sales_manager',     region: regions[2], phone: '9900001004' },
    { login_id: 'im_suresh', name: 'Suresh Patil',    role: 'inventory_manager', region: regions[2], phone: '9900001005' },
    { login_id: 'im_meena',  name: 'Meena Iyer',      role: 'inventory_manager', region: regions[2], phone: '9900001006' },
    { login_id: 'im_rohan',  name: 'Rohan Desai',     role: 'inventory_manager', region: regions[2], phone: '9900001007' },
    { login_id: 'dw_kiran',  name: 'Kiran Gowda',     role: 'dispatch_worker',   region: regions[2], phone: '9900001008' },
    { login_id: 'dw_latha',  name: 'Latha Bhat',      role: 'dispatch_worker',   region: regions[0], phone: '9900001009' },
    { login_id: 'dw_raj',    name: 'Raj Shetty',      role: 'dispatch_worker',   region: regions[1], phone: '9900001010' },
    { login_id: 'dw_vikram', name: 'Vikram Singh',    role: 'dispatch_worker',   region: regions[3] || regions[0], phone: '9900001011' },
    { login_id: 'dw_sanjay', name: 'Sanjay Verma',    role: 'dispatch_worker',   region: regions[4] || regions[1], phone: '9900001012' },
    { login_id: 'dw_anil',   name: 'Anil Kumar',      role: 'dispatch_worker',   region: regions[5] || regions[2], phone: '9900001013' },
  ];
  const users = {};
  for (const u of userDefs) {
    const [row] = await User.findOrCreate({
      where: { login_id: u.login_id },
      defaults: {
        login_id:             u.login_id,
        name:                 u.name,
        role_id:              roles[u.role].id,
        region_id:            u.region.id,
        phone:                u.phone,
        password_hash:        hash('Password@123'),
        is_active:            true,
        must_change_password: false,
        last_login_at:        ago(1),
        last_active_at:       NOW,
      },
    });
    users[u.login_id] = row;
  }
  console.log(`   ${Object.keys(users).length} users`);

  // ── 4. Product Categories ──────────────────────────────────────────────────
  console.log('\n📌  Seeding product categories…');
  const catDefs = [
    { name: 'Filters',             description: 'Oil, air, fuel filters' },
    { name: 'Bearings',            description: 'Ball and roller bearings' },
    { name: 'Brake Parts',         description: 'Pads, shoes, discs' },
    { name: 'Engine Components',   description: 'Pistons, gaskets, valves' },
    { name: 'Electrical',          description: 'Sensors, relays, switches' },
    { name: 'Suspension',          description: 'Bushes, shock absorbers' },
    { name: 'Transmission',        description: 'Clutch plates, gear parts' },
    { name: 'Cooling System',      description: 'Radiators, thermostats, hoses' },
    { name: 'Exhaust System',      description: 'Mufflers, catalytic converters' },
    { name: 'Body & Accessories',  description: 'Mirrors, handles, wipers' },
  ];
  const cats = [];
  for (const c of catDefs) {
    const [row] = await ProductCategory.findOrCreate({ where: { name: c.name }, defaults: c });
    cats.push(row);
  }
  console.log(`   ${cats.length} categories`);

  // ── 5. Units of Measure ────────────────────────────────────────────────────
  console.log('\n📌  Seeding units of measure…');
  const uomDefs = [
    { name: 'Piece',    code: 'PCS',  description: 'Individual unit' },
    { name: 'Box',      code: 'BOX',  description: 'Box of items' },
    { name: 'Set',      code: 'SET',  description: 'Matched set' },
    { name: 'Pair',     code: 'PR',   description: 'Left + right pair' },
    { name: 'Litre',    code: 'LTR',  description: 'Fluid volume' },
    { name: 'Kilogram', code: 'KG',   description: 'Weight' },
    { name: 'Metre',    code: 'MTR',  description: 'Length' },
    { name: 'Roll',     code: 'ROL',  description: 'Roll of material' },
    { name: 'Kit',      code: 'KIT',  description: 'Complete repair kit' },
    { name: 'Packet',   code: 'PKT',  description: 'Retail packet' },
  ];
  const uoms = [];
  for (const u of uomDefs) {
    const [row] = await UnitOfMeasure.findOrCreate({ where: { code: u.code }, defaults: u });
    uoms.push(row);
  }
  console.log(`   ${uoms.length} UOMs`);

  // ── 6. Products ────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding products…');
  const productDefs = [
    { sku: 'FLT-OIL-001',  name: 'Oil Filter — Maruti Suzuki Swift',      cat: 0, uom: 0, purchase: 65,   selling: 95,   dealer: 80  },
    { sku: 'FLT-AIR-002',  name: 'Air Filter — Hyundai i20',               cat: 0, uom: 0, purchase: 120,  selling: 175,  dealer: 150 },
    { sku: 'BRK-PAD-003',  name: 'Brake Pad Set — Honda City (Front)',      cat: 2, uom: 3, purchase: 380,  selling: 540,  dealer: 460 },
    { sku: 'BRG-WHL-004',  name: 'Front Wheel Bearing — Tata Nexon',       cat: 1, uom: 2, purchase: 520,  selling: 740,  dealer: 620 },
    { sku: 'ENG-GSK-005',  name: 'Head Gasket — Mahindra Bolero 2.5',      cat: 3, uom: 0, purchase: 450,  selling: 650,  dealer: 550 },
    { sku: 'ELC-SEN-006',  name: 'O2 Sensor — Toyota Innova Crysta',       cat: 4, uom: 0, purchase: 1200, selling: 1750, dealer: 1500 },
    { sku: 'SUS-BSH-007',  name: 'Suspension Bush Kit — Maruti Ertiga',    cat: 5, uom: 8, purchase: 290,  selling: 420,  dealer: 360 },
    { sku: 'TRN-CLT-008',  name: 'Clutch Plate — Hero Splendor',           cat: 6, uom: 0, purchase: 340,  selling: 490,  dealer: 420 },
    { sku: 'COL-THR-009',  name: 'Thermostat — Ford EcoSport 1.5',         cat: 7, uom: 0, purchase: 180,  selling: 260,  dealer: 220 },
    { sku: 'FLT-FUL-010',  name: 'Fuel Filter — Bajaj Pulsar 150',         cat: 0, uom: 0, purchase: 95,   selling: 140,  dealer: 115 },
  ];
  const products = [];
  for (const p of productDefs) {
    const [row] = await Product.findOrCreate({
      where: { sku: p.sku },
      defaults: {
        sku:                  p.sku,
        name:                 p.name,
        category_id:          cats[p.cat].id,
        uom_id:               uoms[p.uom].id,
        purchase_price:       p.purchase,
        selling_price:        p.selling,
        dealer_landing_price: p.dealer,
        reorder_threshold:    20,
        remarks:              'Sample product — seeded',
      },
    });
    products.push(row);
  }
  console.log(`   ${products.length} products`);

  // ── 7. Pricing ─────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding pricing history…');
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await Pricing.findOrCreate({
      where: { product_id: p.id, effective_from: '2025-01-01' },
      defaults: {
        product_id:          p.id,
        purchase_price:      parseFloat(p.purchase_price) * 0.9,
        dealer_landing_price: parseFloat(p.dealer_landing_price) * 0.95,
        selling_price:       parseFloat(p.selling_price) * 0.95,
        effective_from:      '2025-01-01',
        effective_to:        '2025-12-31',
        created_by:          users['admin01'].id,
        notes:               'Initial pricing — FY 2025',
      },
    });
    await Pricing.findOrCreate({
      where: { product_id: p.id, effective_from: '2026-01-01' },
      defaults: {
        product_id:          p.id,
        purchase_price:      p.purchase_price,
        dealer_landing_price: p.dealer_landing_price,
        selling_price:       p.selling_price,
        effective_from:      '2026-01-01',
        effective_to:        null,
        created_by:          users['admin01'].id,
        notes:               'Revised pricing — FY 2026',
      },
    });
  }
  console.log(`   ${products.length * 2} pricing rows (2 per product)`);

  // ── 8. Customers ───────────────────────────────────────────────────────────
  console.log('\n📌  Seeding customers…');
  const customerDefs = [
    { company_name: 'Sri Ram Auto Parts',        gst: '29AABCS1234A1Z5', sm: 'sm_ravi',  region: 0, credit: 50000  },
    { company_name: 'Venkatesh Motors',          gst: '29BBBCV5678B2Z6', sm: 'sm_ravi',  region: 0, credit: 75000  },
    { company_name: 'Kaveri Auto Traders',       gst: '29CCCCK9012C3Z7', sm: 'sm_priya', region: 1, credit: 40000  },
    { company_name: 'Cauvery Spare Parts',       gst: '29DDDDC3456D4Z8', sm: 'sm_priya', region: 1, credit: 60000  },
    { company_name: 'Bengaluru Auto Hub',        gst: '29EEEEE7890E5Z9', sm: 'sm_anand', region: 2, credit: 100000 },
    { company_name: 'Namma Auto Distributors',   gst: '29FFFFF2345F6Z0', sm: 'sm_anand', region: 2, credit: 80000  },
    { company_name: 'Royal Spares & Services',   gst: '29GGGGG6789G7Z1', sm: 'sm_ravi',  region: 3, credit: 35000  },
    { company_name: 'Precision Auto Parts',      gst: '29HHHHH0123H8Z2', sm: 'sm_priya', region: 4, credit: 45000  },
    { company_name: 'Shree Siddi Spare Parts',   gst: '29IIIII4567I9Z3', sm: 'sm_anand', region: 2, credit: 55000  },
    { company_name: 'Metro Vehicle Accessories', gst: '29JJJJJ8901J0Z4', sm: 'sm_anand', region: 2, credit: 90000  },
  ];
  const customers = [];
  for (const c of customerDefs) {
    const [row] = await Customer.findOrCreate({
      where: { gst: c.gst },
      defaults: {
        company_name:     c.company_name,
        gst:              c.gst,
        sales_manager_id: users[c.sm].id,
        region_id:        regions[c.region].id,
        credit_limit:     c.credit,
        remarks:          'Sample customer — seeded',
      },
    });
    customers.push(row);
  }
  console.log(`   ${customers.length} customers`);

  // ── 9. Stock ───────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding stock…');
  const stockQtys = [150, 80, 200, 60, 45, 30, 120, 90, 175, 65];
  for (let i = 0; i < products.length; i++) {
    await StockOnHand.findOrCreate({
      where: { product_id: products[i].id },
      defaults: { product_id: products[i].id, quantity: stockQtys[i] },
    });
    await StockReserved.findOrCreate({
      where: { product_id: products[i].id },
      defaults: { product_id: products[i].id, quantity: 0 },
    });
  }
  console.log(`   ${products.length} stock_on_hand + ${products.length} stock_reserved rows`);

  // ── 10. Stock Transactions (opening entries) ───────────────────────────────
  console.log('\n📌  Seeding stock transactions…');
  for (let i = 0; i < products.length; i++) {
    const existing = await StockTransaction.count({ where: { product_id: products[i].id, type: 'stock_in' } });
    if (existing === 0) {
      await StockTransaction.create({
        product_id:      products[i].id,
        type:            'stock_in',
        reference:       `OPENING-${products[i].sku}`,
        quantity_change: stockQtys[i],
        quantity_after:  stockQtys[i],
        unit_cost:       products[i].purchase_price,
        performed_by:    users['im_suresh'].id,
        notes:           'Opening stock — seeded',
      });
    }
  }
  console.log(`   ${products.length} opening stock_transaction rows`);

  // ── 11. Inward Entries ─────────────────────────────────────────────────────
  console.log('\n📌  Seeding inward entries…');
  const inwardDefs = [
    { entry_number: 'INW-2026-001', supplier: 'Bosch India Pvt Ltd',     bill: 'BOSCH-INV-10234', date: '2026-05-10', by: 'im_suresh', items: [0, 1] },
    { entry_number: 'INW-2026-002', supplier: 'Minda Industries Ltd',    bill: 'MINDA-INV-8821',  date: '2026-05-15', by: 'im_meena',  items: [2, 3] },
    { entry_number: 'INW-2026-003', supplier: 'Federal-Mogul Goetze',    bill: 'FMG-INV-5567',    date: '2026-05-20', by: 'im_rohan',  items: [4, 5] },
    { entry_number: 'INW-2026-004', supplier: 'SKF India Ltd',           bill: 'SKF-INV-3301',    date: '2026-05-25', by: 'im_suresh', items: [6, 7] },
    { entry_number: 'INW-2026-005', supplier: 'Denso India Ltd',         bill: 'DENSO-INV-9910',  date: '2026-06-01', by: 'im_meena',  items: [8, 9] },
    { entry_number: 'INW-2026-006', supplier: 'Bosch India Pvt Ltd',     bill: 'BOSCH-INV-10445', date: '2026-06-05', by: 'im_rohan',  items: [0, 2] },
    { entry_number: 'INW-2026-007', supplier: 'Exide Industries Ltd',    bill: 'EXIDE-INV-7723',  date: '2026-06-08', by: 'im_suresh', items: [3, 4] },
    { entry_number: 'INW-2026-008', supplier: 'Sundaram Fasteners Ltd',  bill: 'SFL-INV-4412',    date: '2026-06-10', by: 'im_meena',  items: [5, 6] },
    { entry_number: 'INW-2026-009', supplier: 'Motherson Sumi Systems',  bill: 'MSS-INV-6634',    date: '2026-06-15', by: 'im_rohan',  items: [7, 8] },
    { entry_number: 'INW-2026-010', supplier: 'Minda Industries Ltd',    bill: 'MINDA-INV-9102',  date: '2026-06-18', by: 'im_suresh', items: [1, 9] },
  ];
  const inwardEntries = [];
  for (const ie of inwardDefs) {
    const [row] = await InwardEntry.findOrCreate({
      where: { entry_number: ie.entry_number },
      defaults: {
        entry_number:  ie.entry_number,
        supplier_name: ie.supplier,
        bill_number:   ie.bill,
        bill_date:     ie.date,
        received_by:   users[ie.by].id,
        notes:         `Stock received from ${ie.supplier}`,
      },
    });
    inwardEntries.push({ row, items: ie.items });
  }
  console.log(`   ${inwardEntries.length} inward entries`);

  // ── 12. Inward Items ───────────────────────────────────────────────────────
  console.log('\n📌  Seeding inward items…');
  let inwardItemCount = 0;
  for (const ie of inwardEntries) {
    for (const pidx of ie.items) {
      const existing = await InwardItem.count({ where: { inward_entry_id: ie.row.id, product_id: products[pidx].id } });
      if (existing === 0) {
        await InwardItem.create({
          inward_entry_id:   ie.row.id,
          product_id:        products[pidx].id,
          quantity_received: Math.floor(Math.random() * 30) + 20,
        });
        inwardItemCount++;
      }
    }
  }
  console.log(`   ${inwardItemCount} inward items`);

  // ── 13. Orders ─────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding orders…');
  /**
   * Flow illustrated across 10 orders:
   *   PENDING    → submitted by SM, awaiting IM
   *   APPROVED   → IM approved, challan created
   *   DISPATCHED → DW dispatched
   *   FLAGGED    → IM flagged, waiting SM action
   *   CANCELLED  → SM/IM cancelled
   */
  const orderDefs = [
    { num: 'ORD-2026-0001', cust: 0, sm: 'sm_ravi',  status: 'DISPATCHED', date: '2026-05-12', subtotal: 2470.00,  gst: 444.60,  total: 2914.60 },
    { num: 'ORD-2026-0002', cust: 1, sm: 'sm_ravi',  status: 'APPROVED',   date: '2026-05-20', subtotal: 4310.00,  gst: 775.80,  total: 5085.80 },
    { num: 'ORD-2026-0003', cust: 2, sm: 'sm_priya', status: 'DISPATCHED', date: '2026-05-28', subtotal: 1925.00,  gst: 346.50,  total: 2271.50 },
    { num: 'ORD-2026-0004', cust: 3, sm: 'sm_priya', status: 'PENDING',    date: '2026-06-02', subtotal: 3640.00,  gst: 655.20,  total: 4295.20 },
    { num: 'ORD-2026-0005', cust: 4, sm: 'sm_anand', status: 'APPROVED',   date: '2026-06-05', subtotal: 6125.00,  gst: 1102.50, total: 7227.50 },
    { num: 'ORD-2026-0006', cust: 5, sm: 'sm_anand', status: 'FLAGGED',    date: '2026-06-08', subtotal: 8750.00,  gst: 1575.00, total: 10325.00, flag: 'Qty exceeds current stock. Please reduce quantities for SKU FLT-AIR-002.' },
    { num: 'ORD-2026-0007', cust: 6, sm: 'sm_ravi',  status: 'PENDING',    date: '2026-06-15', subtotal: 1680.00,  gst: 302.40,  total: 1982.40 },
    { num: 'ORD-2026-0008', cust: 7, sm: 'sm_priya', status: 'DISPATCHED', date: '2026-06-18', subtotal: 3290.00,  gst: 592.20,  total: 3882.20 },
    { num: 'ORD-2026-0009', cust: 8, sm: 'sm_anand', status: 'CANCELLED',  date: '2026-06-20', subtotal: 2100.00,  gst: 378.00,  total: 2478.00 },
    { num: 'ORD-2026-0010', cust: 9, sm: 'sm_anand', status: 'PENDING',    date: '2026-06-25', subtotal: 5040.00,  gst: 907.20,  total: 5947.20 },
    // Extra orders to populate every pipeline stage for a rich demo
    { num: 'ORD-2026-0011', cust: 0, sm: 'sm_ravi',  status: 'DISPATCHED', date: '2026-06-10', subtotal: 3200.00,  gst: 576.00,  total: 3776.00 },
    { num: 'ORD-2026-0012', cust: 1, sm: 'sm_ravi',  status: 'DISPATCHED', date: '2026-06-12', subtotal: 2750.00,  gst: 495.00,  total: 3245.00 },
    { num: 'ORD-2026-0013', cust: 2, sm: 'sm_priya', status: 'APPROVED',   date: '2026-06-22', subtotal: 4100.00,  gst: 738.00,  total: 4838.00 },
    { num: 'ORD-2026-0014', cust: 3, sm: 'sm_priya', status: 'APPROVED',   date: '2026-06-24', subtotal: 1560.00,  gst: 280.80,  total: 1840.80 },
    { num: 'ORD-2026-0015', cust: 4, sm: 'sm_anand', status: 'APPROVED',   date: '2026-06-26', subtotal: 5900.00,  gst: 1062.00, total: 6962.00 },
    { num: 'ORD-2026-0016', cust: 5, sm: 'sm_anand', status: 'DISPATCHED', date: '2026-06-14', subtotal: 4400.00,  gst: 792.00,  total: 5192.00 },
  ];
  const orders = [];
  for (const o of orderDefs) {
    const [row] = await Order.findOrCreate({
      where: { order_number: o.num },
      defaults: {
        order_number:      o.num,
        party_id:          customers[o.cust].id,
        sales_manager_id:  users[o.sm].id,
        status:            o.status,
        order_date:        o.date,
        subtotal:          o.subtotal,
        gst_amount:        o.gst,
        grand_total:       o.total,
        credit_hold:       false,
        flag_reason:       o.flag || null,
      },
    });
    orders.push(row);
  }
  console.log(`   ${orders.length} orders`);

  // ── 14. Order Items ────────────────────────────────────────────────────────
  console.log('\n📌  Seeding order items…');
  /**
   * Each order gets 2–3 line items mapped to different products.
   * sm_price is slightly above base selling_price (real-world SM markup).
   */
  const orderItemsDefs = [
    // ORD-0001 (DISPATCHED)
    [{ oi: 0, pi: 0, qty: 10, gst: 18 }, { oi: 0, pi: 1, qty: 8,  gst: 18 }],
    // ORD-0002 (APPROVED)
    [{ oi: 1, pi: 2, qty: 5,  gst: 18 }, { oi: 1, pi: 3, qty: 3,  gst: 18 }],
    // ORD-0003 (DISPATCHED)
    [{ oi: 2, pi: 4, qty: 2,  gst: 18 }, { oi: 2, pi: 9, qty: 8,  gst: 18 }],
    // ORD-0004 (PENDING)
    [{ oi: 3, pi: 5, qty: 2,  gst: 18 }, { oi: 3, pi: 6, qty: 5,  gst: 18 }],
    // ORD-0005 (APPROVED)
    [{ oi: 4, pi: 0, qty: 20, gst: 18 }, { oi: 4, pi: 7, qty: 8,  gst: 18 }, { oi: 4, pi: 8, qty: 5, gst: 18 }],
    // ORD-0006 (FLAGGED)
    [{ oi: 5, pi: 1, qty: 50, gst: 18 }, { oi: 5, pi: 2, qty: 8,  gst: 18 }],
    // ORD-0007 (PENDING)
    [{ oi: 6, pi: 9, qty: 12, gst: 18 }],
    // ORD-0008 (DISPATCHED)
    [{ oi: 7, pi: 3, qty: 4,  gst: 18 }, { oi: 7, pi: 4, qty: 3,  gst: 18 }],
    // ORD-0009 (CANCELLED)
    [{ oi: 8, pi: 5, qty: 1,  gst: 18 }, { oi: 8, pi: 6, qty: 3,  gst: 18 }],
    // ORD-0010 (PENDING)
    [{ oi: 9, pi: 7, qty: 6,  gst: 18 }, { oi: 9, pi: 8, qty: 10, gst: 18 }],
    // ORD-0011 (DISPATCHED → will be FULFILLED in pipeline)
    [{ oi: 10, pi: 0, qty: 6, gst: 18 }, { oi: 10, pi: 2, qty: 4, gst: 18 }],
    // ORD-0012 (DISPATCHED → FULFILLED)
    [{ oi: 11, pi: 3, qty: 5, gst: 18 }, { oi: 11, pi: 9, qty: 6, gst: 18 }],
    // ORD-0013 (APPROVED → DELIVERED, awaiting SM)
    [{ oi: 12, pi: 4, qty: 3, gst: 18 }, { oi: 12, pi: 7, qty: 5, gst: 18 }],
    // ORD-0014 (APPROVED → OUT_FOR_DELIVERY)
    [{ oi: 13, pi: 1, qty: 4, gst: 18 }],
    // ORD-0015 (APPROVED → IM_APPROVAL, admin override case)
    [{ oi: 14, pi: 0, qty: 8, gst: 18 }, { oi: 14, pi: 8, qty: 6, gst: 18 }],
    // ORD-0016 (DISPATCHED → FULFILLED)
    [{ oi: 15, pi: 5, qty: 3, gst: 18 }, { oi: 15, pi: 6, qty: 4, gst: 18 }],
  ];
  const allOrderItems = [];
  for (const group of orderItemsDefs) {
    for (const item of group) {
      const existing = await OrderItem.count({ where: { order_id: orders[item.oi].id, product_id: products[item.pi].id } });
      if (existing === 0) {
        const p         = products[item.pi];
        const basePrice = parseFloat(p.selling_price);
        const smPrice   = +(basePrice * 1.02).toFixed(4); // 2% markup
        const lineTotal = +(item.qty * smPrice).toFixed(2);
        const dlPrice   = parseFloat(p.dealer_landing_price || 0);
        const row = await OrderItem.create({
          order_id:         orders[item.oi].id,
          product_id:       p.id,
          part_number:      p.sku || null,
          description:      p.name || null,
          dl_price:         dlPrice,
          quantity:         item.qty,
          base_price:       basePrice,
          sm_price:         smPrice,
          gst_percent:      item.gst,
          line_total:       lineTotal,
          suggestion_added: false,
        });
        allOrderItems.push(row);
      }
    }
  }
  console.log(`   ${allOrderItems.length} order items`);

  // ── 15. Order Status History ───────────────────────────────────────────────
  console.log('\n📌  Seeding order status history…');
  /**
   * Each order gets the trail of status changes it passed through.
   */
  const statusTrails = [
    // ORD-0001: PENDING → APPROVED → DISPATCHED
    { oi: 0, trail: [
      { from: null,       to: 'PENDING',    by: 'sm_ravi',  reason: null },
      { from: 'PENDING',  to: 'APPROVED',   by: 'im_suresh', reason: null },
      { from: 'APPROVED', to: 'DISPATCHED', by: 'dw_kiran',  reason: 'Picked and dispatched' },
    ]},
    // ORD-0002: PENDING → APPROVED
    { oi: 1, trail: [
      { from: null,      to: 'PENDING',  by: 'sm_ravi',   reason: null },
      { from: 'PENDING', to: 'APPROVED', by: 'im_suresh', reason: null },
    ]},
    // ORD-0003: PENDING → APPROVED → DISPATCHED
    { oi: 2, trail: [
      { from: null,       to: 'PENDING',    by: 'sm_priya', reason: null },
      { from: 'PENDING',  to: 'APPROVED',   by: 'im_meena', reason: null },
      { from: 'APPROVED', to: 'DISPATCHED', by: 'dw_latha', reason: 'Picked and dispatched' },
    ]},
    // ORD-0004: PENDING only
    { oi: 3, trail: [{ from: null, to: 'PENDING', by: 'sm_priya', reason: null }]},
    // ORD-0005: PENDING → APPROVED
    { oi: 4, trail: [
      { from: null,      to: 'PENDING',  by: 'sm_anand',  reason: null },
      { from: 'PENDING', to: 'APPROVED', by: 'im_rohan',  reason: null },
    ]},
    // ORD-0006: PENDING → FLAGGED
    { oi: 5, trail: [
      { from: null,      to: 'PENDING', by: 'sm_anand', reason: null },
      { from: 'PENDING', to: 'FLAGGED', by: 'im_meena', reason: 'Qty exceeds current stock for FLT-AIR-002' },
    ]},
    // ORD-0007: PENDING only
    { oi: 6, trail: [{ from: null, to: 'PENDING', by: 'sm_ravi', reason: null }]},
    // ORD-0008: PENDING → APPROVED → DISPATCHED
    { oi: 7, trail: [
      { from: null,       to: 'PENDING',    by: 'sm_priya', reason: null },
      { from: 'PENDING',  to: 'APPROVED',   by: 'im_suresh', reason: null },
      { from: 'APPROVED', to: 'DISPATCHED', by: 'dw_raj',    reason: 'Picked and dispatched' },
    ]},
    // ORD-0009: PENDING → CANCELLED
    { oi: 8, trail: [
      { from: null,      to: 'PENDING',   by: 'sm_anand', reason: null },
      { from: 'PENDING', to: 'CANCELLED', by: 'sm_anand', reason: 'Customer requested cancellation' },
    ]},
    // ORD-0010: PENDING only
    { oi: 9, trail: [{ from: null, to: 'PENDING', by: 'sm_anand', reason: null }]},
  ];
  let statusHistCount = 0;
  for (const trail of statusTrails) {
    const existingCount = await OrderStatusHistory.count({ where: { order_id: orders[trail.oi].id } });
    if (existingCount === 0) {
      for (const s of trail.trail) {
        await OrderStatusHistory.create({
          order_id:   orders[trail.oi].id,
          from_status: s.from,
          to_status:   s.to,
          changed_by:  users[s.by].id,
          reason:      s.reason,
        });
        statusHistCount++;
      }
    }
  }
  console.log(`   ${statusHistCount} status history rows`);

  // ── 16. Challans (for APPROVED + DISPATCHED orders) ────────────────────────
  console.log('\n📌  Seeding challans…');
  // Orders 0,1,2,4,7 are APPROVED or DISPATCHED
  const challanOrders = [
    { oi: 0, num: 'CHN-2026-00001' },
    { oi: 1, num: 'CHN-2026-00002' },
    { oi: 2, num: 'CHN-2026-00003' },
    { oi: 4, num: 'CHN-2026-00004' },
    { oi: 7, num: 'CHN-2026-00005' },
  ];
  const challans = [];
  for (const c of challanOrders) {
    const [row] = await Challan.findOrCreate({
      where: { order_id: orders[c.oi].id },
      defaults: {
        challan_number: c.num,
        order_id:       orders[c.oi].id,
        generated_at:   NOW,
        pdf_path:       null,
      },
    });
    challans.push(row);
  }
  console.log(`   ${challans.length} challans`);

  // ── 16b. Fulfilment pipeline (two-table model) ─────────────────────────────
  // Master ledger (fulfillment_order) + internal pipeline (pipeline_tracking),
  // spread across every stage so each role logs into a meaningful dashboard.
  console.log('\n📌  Seeding fulfilment pipeline…');

  const roleNameById = {};
  Object.values(users).forEach(u => {
    roleNameById[u.id] = ({ 1: 'admin', 2: 'sales_manager', 3: 'inventory_manager', 4: 'dispatch_worker' })[u.role_id] || 'admin';
  });
  const roleName = (login) => roleNameById[users[login].id];

  // hrsAgo helper for staggered milestone timestamps
  const hrsAgo = (h) => new Date(Date.now() - h * 3_600_000);

  // Each def: order index, terminal stage, actors, picked items, per-stage hour offsets, override flag.
  const pipelineDefs = [
    // FULFILLED (complete) — full happy path, order 0
    { oi: 0, stage: 'FULFILLED', sm: 'sm_ravi', im: 'im_suresh', dw: 'dw_kiran',
      items: [{ pi: 0, qty: 10 }, { pi: 1, qty: 8 }],
      vehicle: 'KA01 AB 1234', driver: 'Manjunath', phone: '9900012345',
      offsets: { admin: 120, im: 110, dwAssign: 108, out: 96, delivered: 90, fulfilled: 84 }, override: false },

    // FULFILLED — order 11
    { oi: 10, stage: 'FULFILLED', sm: 'sm_ravi', im: 'im_meena', dw: 'dw_latha',
      items: [{ pi: 0, qty: 6 }, { pi: 2, qty: 4 }],
      vehicle: 'KA02 BC 4411', driver: 'Suresh', phone: '9900022222',
      offsets: { admin: 100, im: 92, dwAssign: 90, out: 80, delivered: 72, fulfilled: 60 }, override: false },

    // FULFILLED — order 12 (fast, no bottleneck)
    { oi: 11, stage: 'FULFILLED', sm: 'sm_ravi', im: 'im_suresh', dw: 'dw_raj',
      items: [{ pi: 3, qty: 5 }, { pi: 9, qty: 6 }],
      vehicle: 'KA03 DE 7788', driver: 'Ganesh', phone: '9900033333',
      offsets: { admin: 72, im: 70, dwAssign: 69, out: 66, delivered: 63, fulfilled: 60 }, override: false },

    // FULFILLED — order 16 (had an admin override at DW stage)
    { oi: 15, stage: 'FULFILLED', sm: 'sm_anand', im: 'im_rohan', dw: 'dw_kiran',
      items: [{ pi: 5, qty: 3 }, { pi: 6, qty: 4 }],
      vehicle: 'KA04 FG 1010', driver: 'Rahim', phone: '9900044444',
      offsets: { admin: 90, im: 80, dwAssign: 78, out: 40, delivered: 30, fulfilled: 24 }, override: true },

    // DELIVERED (awaiting SM) — order 2
    { oi: 2, stage: 'DELIVERED', sm: 'sm_priya', im: 'im_meena', dw: 'dw_latha',
      items: [{ pi: 4, qty: 2 }, { pi: 9, qty: 8 }],
      vehicle: 'KA05 CJ 8890', driver: 'Ganesh', phone: '9900054321',
      offsets: { admin: 60, im: 54, dwAssign: 52, out: 40, delivered: 12 }, override: false },

    // DELIVERED (awaiting SM) — order 13
    { oi: 12, stage: 'DELIVERED', sm: 'sm_priya', im: 'im_suresh', dw: 'dw_raj',
      items: [{ pi: 4, qty: 3 }, { pi: 7, qty: 5 }],
      vehicle: 'KA06 HK 2323', driver: 'Vinod', phone: '9900066666',
      offsets: { admin: 48, im: 44, dwAssign: 42, out: 30, delivered: 6 }, override: false },

    // OUT_FOR_DELIVERY — order 8 (DISPATCHED)
    { oi: 7, stage: 'OUT_FOR_DELIVERY', sm: 'sm_priya', im: 'im_suresh', dw: 'dw_raj',
      items: [{ pi: 3, qty: 4 }, { pi: 4, qty: 3 }],
      vehicle: 'KA03 KL 4455', driver: 'Rahim', phone: '9900067890',
      offsets: { admin: 36, im: 30, dwAssign: 28, out: 5 }, override: false },

    // OUT_FOR_DELIVERY — order 14
    { oi: 13, stage: 'OUT_FOR_DELIVERY', sm: 'sm_priya', im: 'im_meena', dw: 'dw_kiran',
      items: [{ pi: 1, qty: 4 }],
      vehicle: 'KA07 MN 9090', driver: 'Kumar', phone: '9900077777',
      offsets: { admin: 30, im: 26, dwAssign: 24, out: 3 }, override: false },

    // DW_ASSIGNMENT (awaiting pickup) — order 1
    { oi: 1, stage: 'DW_ASSIGNMENT', sm: 'sm_ravi', im: 'im_suresh', dw: 'dw_kiran',
      items: [{ pi: 2, qty: 5 }, { pi: 3, qty: 3 }],
      offsets: { admin: 24, im: 18, dwAssign: 2 }, override: false },

    // IM_APPROVAL — order 5 (admin approved, awaiting IM) — slow admin→IM (bottleneck sample)
    { oi: 4, stage: 'IM_APPROVAL', sm: 'sm_anand', im: null, dw: null,
      items: [], offsets: { admin: 20 }, override: false },

    // IM_APPROVAL — order 15 (admin approved, awaiting IM)
    { oi: 14, stage: 'IM_APPROVAL', sm: 'sm_anand', im: null, dw: null,
      items: [], offsets: { admin: 10 }, override: false },

    // ADMIN_APPROVAL just done — order 13 already used; use nothing extra here
  ];

  // stage → the pipeline_tracking column that stores its milestone time
  const stageIndex = { IM_APPROVAL: 0, DW_ASSIGNMENT: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, FULFILLED: 4 };
  const stageOrder = ['IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED'];

  let pcount = 0, picount = 0, phcount = 0;

  for (const d of pipelineDefs) {
    const order = orders[d.oi];
    const already = await PipelineTracking.findOne({ where: { order_id: order.id } });
    if (already) continue;

    const targetIdx = stageIndex[d.stage];
    const isComplete = d.stage === 'FULFILLED';

    // Master ledger
    const [fulfillment] = await FulfillmentOrder.findOrCreate({
      where: { order_id: order.id },
      defaults: {
        order_id: order.id,
        state: isComplete ? 'COMPLETE' : 'INCOMPLETE',
        completed_at: isComplete ? hrsAgo(d.offsets.fulfilled) : null,
      },
    });

    const o = d.offsets;
    const pipeline = await PipelineTracking.create({
      order_id: order.id,
      fulfillment_order_id: fulfillment.id,
      stage: d.stage,
      admin_approved_by: users['admin01'].id,
      im_approved_by: d.im ? users[d.im].id : null,
      dw_id: d.dw ? users[d.dw].id : null,
      dw_assigned_by: d.dw ? users[d.im || 'admin01'].id : null,
      sales_manager_id: users[d.sm].id,
      fulfilled_by: isComplete ? users[d.sm].id : null,
      admin_approved_at:   o.admin != null ? hrsAgo(o.admin) : null,
      im_approved_at:      o.im != null ? hrsAgo(o.im) : null,
      dw_assigned_at:      o.dwAssign != null ? hrsAgo(o.dwAssign) : null,
      out_for_delivery_at: o.out != null ? hrsAgo(o.out) : null,
      delivered_at:        o.delivered != null ? hrsAgo(o.delivered) : null,
      fulfilled_at:        o.fulfilled != null ? hrsAgo(o.fulfilled) : null,
      // ETA: for completed stages use the actual delivery time; otherwise ~24h after assignment
      expected_delivery_at: o.delivered != null ? hrsAgo(o.delivered)
                            : (o.dwAssign != null ? hrsAgo(o.dwAssign - 24) : null),
      vehicle_number: d.vehicle || null,
      driver_name: d.driver || null,
      driver_phone: d.phone || null,
      sold_notified: isComplete,
      had_override: !!d.override,
    });
    pcount++;

    // Picked parts (uniform product_id)
    for (const it of d.items) {
      await PipelineItem.create({
        pipeline_id: pipeline.id, product_id: products[it.pi].id, quantity: it.qty, available_at_pick: it.qty,
      });
      picount++;
    }

    // Stage history trail up to the current stage
    const actorForStage = {
      IM_APPROVAL: d.sm,                 // order placed by SM → arrives at IM approval
      DW_ASSIGNMENT: d.im || d.sm,       // IM approved & assigned
      OUT_FOR_DELIVERY: d.dw || d.sm,
      DELIVERED: d.dw || d.sm,
      FULFILLED: d.sm,
    };
    const tsForStage = {
      IM_APPROVAL: o.im != null ? o.im : o.admin, DW_ASSIGNMENT: o.dwAssign,
      OUT_FOR_DELIVERY: o.out, DELIVERED: o.delivered, FULFILLED: o.fulfilled,
    };
    let prev = null;
    for (let i = 0; i <= targetIdx; i++) {
      const st = stageOrder[i];
      const by = actorForStage[st];
      const isOverrideRow = d.override && st === 'OUT_FOR_DELIVERY'; // the override happened at DW handoff
      await PipelineStageHistory.create({
        pipeline_id: pipeline.id,
        order_id: order.id,
        from_stage: prev,
        to_stage: st,
        changed_by: users[isOverrideRow ? 'admin01' : by].id,
        changed_by_role: isOverrideRow ? 'admin' : roleName(by),
        is_admin_override: isOverrideRow,
        note: `${st}${isOverrideRow ? ' (admin override)' : ''} (seed)`,
        created_at: tsForStage[st] != null ? hrsAgo(tsForStage[st]) : NOW,
      });
      phcount++;
      prev = st;
    }
  }
  console.log(`   ${pcount} pipelines, ${picount} pipeline items, ${phcount} stage-history rows`);

  // ── 16c. Notifications (Order sold, reorder, override) ─────────────────────
  console.log('\n📌  Seeding notifications…');
  const notifDefs = [
    { to: 'im_suresh', from: 'sm_ravi',  type: 'ORDER_SOLD',      title: 'Order sold: ORD-2026-0001', body: 'Ravi Kumar sold order ORD-2026-0001. Reorder may be required.', link: '/im/requests', read: false, hrs: 84 },
    { to: 'im_suresh', from: 'sm_ravi',  type: 'REORDER_REQUEST', title: 'Reorder requested for ORD-2026-0001', body: '2 part(s) requested for reorder based on customer demand.', link: '/im/requests', read: false, hrs: 84 },
    { to: 'im_meena',  from: 'sm_ravi',  type: 'ORDER_SOLD',      title: 'Order sold: ORD-2026-0011', body: 'Ravi Kumar sold order ORD-2026-0011.', link: '/im/requests', read: false, hrs: 60 },
    { to: 'im_rohan',  from: 'admin01',  type: 'ADMIN_OVERRIDE',  title: 'Admin override: delivery', body: 'Admin advanced a stuck delivery for ORD-2026-0016.', link: '/im/pipeline', read: true, hrs: 40 },
    { to: 'dw_kiran',  from: 'im_suresh',type: 'PIPELINE_ADVANCED', title: 'New delivery assigned to you', body: 'You have a new delivery to pick up for ORD-2026-0002.', link: '/dw/pipeline', read: false, hrs: 2 },
    { to: 'sm_priya',  from: 'dw_latha', type: 'PIPELINE_ADVANCED', title: 'Delivery received — confirm the sale', body: 'Parts for ORD-2026-0003 were delivered. Mark sold when handed to the customer.', link: '/sm/pipeline', read: false, hrs: 12 },
    { to: 'sm_ravi',   from: 'im_suresh',type: 'REORDER_PLACED',  title: 'Reorder placed', body: 'Your reorder request has been placed.', link: '/sm/requests', read: true, hrs: 30 },
    { to: 'admin01',   from: 'sm_anand', type: 'GENERAL',         title: 'Pipeline healthy', body: 'All regions reporting normal throughput.', link: '/admin', read: true, hrs: 5 },
  ];
  let ncount = 0;
  for (const n of notifDefs) {
    const exists = await Notification.findOne({ where: { recipient_id: users[n.to].id, title: n.title } });
    if (exists) continue;
    await Notification.create({
      recipient_id: users[n.to].id,
      recipient_role: roleName(n.to),
      sender_id: users[n.from].id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      is_read: n.read,
      read_at: n.read ? hrsAgo(n.hrs - 1) : null,
      created_at: hrsAgo(n.hrs),
    });
    ncount++;
  }
  console.log(`   ${ncount} notifications`);

  // ── 16d. Part requests (SM → IM reorder / new part) ────────────────────────
  console.log('\n📌  Seeding part requests…');
  const partReqDefs = [
    { by: 'sm_ravi',  im: 'im_suresh', type: 'REORDER',  pi: 0, qty: 10, oi: 0,  status: 'OPEN',         notes: 'High demand from Speedway Motors' },
    { by: 'sm_ravi',  im: 'im_suresh', type: 'REORDER',  pi: 1, qty: 8,  oi: 0,  status: 'ACKNOWLEDGED', notes: 'Auto-raised on sale' },
    { by: 'sm_ravi',  im: 'im_meena',  type: 'REORDER',  pi: 0, qty: 6,  oi: 10, status: 'ORDERED',      notes: 'Reordered same parts' },
    { by: 'sm_anand', im: 'im_rohan',  type: 'REORDER',  pi: 5, qty: 5,  oi: 15, status: 'OPEN',         notes: 'Customer wants more brake pads' },
    { by: 'sm_priya', im: 'im_suresh', type: 'NEW_PART', pi: null, qty: 15, oi: null, status: 'OPEN',    notes: 'Customer asking for heavy-duty clutch plate', proposed: 'Heavy-Duty Clutch Plate 320mm' },
    { by: 'sm_anand', im: 'im_meena',  type: 'NEW_PART', pi: null, qty: 20, oi: null, status: 'OPEN',    notes: 'Demand for LED headlamp assembly', proposed: 'LED Headlamp Assembly H4' },
  ];
  let prcount = 0;
  for (const pr of partReqDefs) {
    const exists = await PartRequest.findOne({
      where: { requested_by: users[pr.by].id, type: pr.type, notes: pr.notes },
    });
    if (exists) continue;
    await PartRequest.create({
      requested_by: users[pr.by].id,
      assigned_im_id: users[pr.im].id,
      type: pr.type,
      product_id: pr.pi != null ? products[pr.pi].id : null,
      proposed_name: pr.proposed || null,
      quantity: pr.qty,
      linked_order_id: pr.oi != null ? orders[pr.oi].id : null,
      customer_id: pr.oi != null ? customers[orderDefs[pr.oi].cust].id : null,
      status: pr.status,
      ordered_at: pr.status === 'ORDERED' ? hrsAgo(20) : null,
      notes: pr.notes,
    });
    prcount++;
  }
  console.log(`   ${prcount} part requests`);


  // ── 17. Reorder Flags ──────────────────────────────────────────────────────
  console.log('\n📌  Seeding reorder flags…');
  const reorderDefs = [
    { pi: 5, by: 'sm_anand', cust: 4, qty: 15, status: 'OPEN',     notes: 'Customer urgently needs O2 sensors' },
    { pi: 1, by: 'sm_ravi',  cust: 0, qty: 30, status: 'OPEN',     notes: 'Air filter stock nearly exhausted' },
    { pi: 3, by: 'sm_priya', cust: 2, qty: 20, status: 'ORDERED',  notes: 'Wheel bearing for fleet customer' },
    { pi: 7, by: 'sm_anand', cust: 5, qty: 10, status: 'RECEIVED', notes: 'Clutch plate replenishment' },
    { pi: 4, by: 'sm_ravi',  cust: 1, qty: 8,  status: 'OPEN',     notes: 'Head gasket low stock' },
    { pi: 6, by: 'sm_priya', cust: 3, qty: 25, status: 'OPEN',     notes: 'Suspension bush kits — bulk request' },
    { pi: 2, by: 'sm_anand', cust: 8, qty: 12, status: 'ORDERED',  notes: 'Brake pads for workshop' },
    { pi: 8, by: 'sm_ravi',  cust: 6, qty: 18, status: 'OPEN',     notes: 'Thermostat running low' },
    { pi: 0, by: 'sm_priya', cust: 7, qty: 50, status: 'RECEIVED', notes: 'Oil filters — high-velocity SKU' },
    { pi: 9, by: 'sm_anand', cust: 9, qty: 40, status: 'OPEN',     notes: 'Fuel filters — advance flag' },
  ];
  const reorderFlags = [];
  for (const r of reorderDefs) {
    const existing = await ReorderFlag.count({ where: { product_id: products[r.pi].id, flagged_by: users[r.by].id } });
    if (existing === 0) {
      const row = await ReorderFlag.create({
        product_id:      products[r.pi].id,
        flagged_by:      users[r.by].id,
        party_id:        customers[r.cust].id,
        quantity_wanted: r.qty,
        notes:           r.notes,
        status:          r.status,
        ordered_at:      r.status !== 'OPEN' ? ago(5) : null,
      });
      reorderFlags.push(row);
    }
  }
  console.log(`   ${reorderFlags.length} reorder flags`);

  // ── 18. Damaged Stock ──────────────────────────────────────────────────────
  // Covers: IM Damaged Stock page — GET /inventory/damaged
  // Realistic scenarios: physical damage, transit damage, expiry write-off, QC rejection
  console.log('\n📌  Seeding damaged stock records…');
  const damagedDefs = [
    { pi: 0, qty: 5,  reason: 'Packaging torn during transit — oil leakage',         by: 'im_suresh', remarks: 'Received in damaged condition from Bosch INW-2026-001' },
    { pi: 1, qty: 3,  reason: 'Air filter element crushed in warehouse shelf collapse', by: 'im_meena',  remarks: 'Shelf B-4 incident on 2026-05-18' },
    { pi: 2, qty: 2,  reason: 'Brake pad bonding delaminated — QC rejection',         by: 'im_rohan',  remarks: 'Batch BRK-MAY-22 failed adhesion test' },
    { pi: 3, qty: 1,  reason: 'Wheel bearing inner race cracked — forklift damage',  by: 'im_suresh', remarks: 'Forklift incident near dock area' },
    { pi: 4, qty: 4,  reason: 'Head gasket corroded — improper storage (moisture)',  by: 'im_meena',  remarks: 'Found during June stock count' },
    { pi: 5, qty: 2,  reason: 'O2 sensor connector pins bent — mishandling',         by: 'im_rohan',  remarks: 'Staff training required on sensor handling' },
    { pi: 6, qty: 6,  reason: 'Suspension bush kit rubber cracked — UV exposure',   by: 'im_suresh', remarks: 'Stored near sunlight-facing window for 3 months' },
    { pi: 7, qty: 3,  reason: 'Clutch plate friction material flaked off',           by: 'im_meena',  remarks: 'Possible manufacturing defect — return to vendor' },
    { pi: 8, qty: 2,  reason: 'Thermostat housing cracked during pressure test',     by: 'im_rohan',  remarks: 'Failed incoming QC check' },
    { pi: 9, qty: 4,  reason: 'Fuel filter element ruptured — excess pressure test', by: 'im_suresh', remarks: 'Test jig miscalibrated; jig now corrected' },
  ];
  let damagedCount = 0;
  for (const d of damagedDefs) {
    const existing = await StockDamaged.count({
      where: { product_id: products[d.pi].id, damage_reason: d.reason },
    });
    if (existing === 0) {
      await StockDamaged.create({
        product_id:    products[d.pi].id,
        quantity:      d.qty,
        damage_reason: d.reason,
        recorded_by:   users[d.by].id,
        remarks:       d.remarks,
      });

      // Deduct from stock_on_hand to keep numbers consistent
      const soh = await StockOnHand.findOne({ where: { product_id: products[d.pi].id } });
      if (soh) {
        const newQty = Math.max(0, parseFloat(soh.quantity) - d.qty);
        await soh.update({ quantity: newQty });

        // Log in stock_transaction ledger
        await StockTransaction.create({
          product_id:      products[d.pi].id,
          type:            'damage',
          reference:       `DMG-SEED-${d.pi + 1}`,
          quantity_change: -d.qty,
          quantity_after:  newQty,
          performed_by:    users[d.by].id,
          notes:           d.reason,
        });
      }
      damagedCount++;
    }
  }
  console.log(`   ${damagedCount} damaged stock records`);

  // ── 19. Inventory Adjustments ──────────────────────────────────────────────
  // Covers: IM Adjustments page — GET /inventory/adjustments
  // Mix of upward corrections (found stock) and downward corrections (write-offs)
  console.log('\n📌  Seeding inventory adjustments…');
  const adjustmentDefs = [
    { pi: 0, qtyBefore: null /* auto-fetch */, qtyAfter: 130, reason: 'Physical count correction — June cycle count', by: 'im_suresh', approvedBy: 'im_meena',  remarks: 'System showed 145, physical count gave 130' },
    { pi: 1, qtyBefore: null,                  qtyAfter: 72,  reason: 'Physical count correction — June cycle count', by: 'im_meena',  approvedBy: 'im_suresh', remarks: 'System showed 77, physical count gave 72' },
    { pi: 2, qtyBefore: null,                  qtyAfter: 195, reason: 'Stock found in overflow bin — added to system', by: 'im_rohan',  approvedBy: 'im_suresh', remarks: 'Unlabelled carton from INW-2026-006 found behind rack' },
    { pi: 3, qtyBefore: null,                  qtyAfter: 58,  reason: 'Write-off — 2 units unaccounted after count',   by: 'im_suresh', approvedBy: 'im_meena',  remarks: 'Delta within acceptable variance; written off' },
    { pi: 4, qtyBefore: null,                  qtyAfter: 42,  reason: 'Upward correction — 3 units transferred from branch', by: 'im_meena', approvedBy: 'im_rohan', remarks: 'Transfer received from Hubli branch on 2026-06-10' },
    { pi: 5, qtyBefore: null,                  qtyAfter: 28,  reason: 'Correction after QC re-test — 2 units cleared', by: 'im_rohan',  approvedBy: 'im_suresh', remarks: 'Previously held units passed re-inspection' },
    { pi: 6, qtyBefore: null,                  qtyAfter: 110, reason: 'Annual stock audit adjustment',                 by: 'im_suresh', approvedBy: null,         remarks: 'Self-approved per policy for variance < 5%' },
    { pi: 7, qtyBefore: null,                  qtyAfter: 85,  reason: 'Cycle count correction — May',                 by: 'im_meena',  approvedBy: 'im_rohan',  remarks: 'Count done by 2-person team, reconciled' },
    { pi: 8, qtyBefore: null,                  qtyAfter: 170, reason: 'Stock received outside inward system — emergency re-stock', by: 'im_rohan', approvedBy: 'im_suresh', remarks: 'Emergency PO raised verbally; inward entry pending' },
    { pi: 9, qtyBefore: null,                  qtyAfter: 60,  reason: 'Correction after bin audit — 5 units missing',  by: 'im_suresh', approvedBy: 'im_meena',  remarks: 'Bins AI-7 and AI-8 reconciled on 2026-06-20' },
  ];
  let adjustCount = 0;
  for (const a of adjustmentDefs) {
    const existing = await InventoryAdjustment.count({
      where: { product_id: products[a.pi].id, reason: a.reason },
    });
    if (existing === 0) {
      const soh = await StockOnHand.findOne({ where: { product_id: products[a.pi].id } });
      const qtyBefore = soh ? parseFloat(soh.quantity) : 0;
      const qtyAfter  = a.qtyAfter;
      const delta     = qtyAfter - qtyBefore;

      await InventoryAdjustment.create({
        product_id:      products[a.pi].id,
        reason:          a.reason,
        quantity_before: qtyBefore,
        quantity_after:  qtyAfter,
        approved_by:     a.approvedBy ? users[a.approvedBy].id : null,
        performed_by:    users[a.by].id,
        remarks:         a.remarks,
      });

      // Sync stock_on_hand to the adjusted value
      if (soh) await soh.update({ quantity: qtyAfter });

      // Log the delta in stock_transaction ledger
      await StockTransaction.create({
        product_id:      products[a.pi].id,
        type:            'adjustment',
        reference:       `ADJ-SEED-${a.pi + 1}`,
        quantity_change: delta,
        quantity_after:  qtyAfter,
        performed_by:    users[a.by].id,
        notes:           a.reason,
      });

      adjustCount++;
    }
  }
  console.log(`   ${adjustCount} inventory adjustments`);

  // ── 20. Additional Stock Transactions (dispatch + reserved) ───────────────
  // Covers: IM Transactions ledger — GET /inventory/transactions
  // Adds dispatch and reserved entries so the ledger has variety across all types
  console.log('\n📌  Seeding additional stock transactions…');
  const extraTxnDefs = [
    // dispatch entries — stock out for DISPATCHED orders
    { pi: 0, type: 'dispatch',   ref: 'ORD-2026-0001', qty: -10, by: 'dw_kiran', notes: 'Dispatched for ORD-2026-0001' },
    { pi: 1, type: 'dispatch',   ref: 'ORD-2026-0001', qty: -8,  by: 'dw_kiran', notes: 'Dispatched for ORD-2026-0001' },
    { pi: 4, type: 'dispatch',   ref: 'ORD-2026-0003', qty: -2,  by: 'dw_latha', notes: 'Dispatched for ORD-2026-0003' },
    { pi: 9, type: 'dispatch',   ref: 'ORD-2026-0003', qty: -8,  by: 'dw_latha', notes: 'Dispatched for ORD-2026-0003' },
    { pi: 3, type: 'dispatch',   ref: 'ORD-2026-0008', qty: -4,  by: 'dw_raj',   notes: 'Dispatched for ORD-2026-0008' },
    { pi: 4, type: 'dispatch',   ref: 'ORD-2026-0008', qty: -3,  by: 'dw_raj',   notes: 'Dispatched for ORD-2026-0008' },
    // reserved entries — stock held for APPROVED orders
    { pi: 2, type: 'reserved',   ref: 'ORD-2026-0002', qty: 5,   by: 'im_suresh', notes: 'Reserved for approved ORD-2026-0002' },
    { pi: 3, type: 'reserved',   ref: 'ORD-2026-0002', qty: 3,   by: 'im_suresh', notes: 'Reserved for approved ORD-2026-0002' },
    { pi: 0, type: 'reserved',   ref: 'ORD-2026-0005', qty: 20,  by: 'im_rohan',  notes: 'Reserved for approved ORD-2026-0005' },
    { pi: 7, type: 'reserved',   ref: 'ORD-2026-0005', qty: 8,   by: 'im_rohan',  notes: 'Reserved for approved ORD-2026-0005' },
  ];
  let extraTxnCount = 0;
  for (const tx of extraTxnDefs) {
    const existing = await StockTransaction.count({ where: { reference: tx.ref, type: tx.type, product_id: products[tx.pi].id } });
    if (existing === 0) {
      const soh = await StockOnHand.findOne({ where: { product_id: products[tx.pi].id } });
      const qtyAfter = soh ? Math.max(0, parseFloat(soh.quantity) + tx.qty) : 0;
      await StockTransaction.create({
        product_id:      products[tx.pi].id,
        type:            tx.type,
        reference:       tx.ref,
        quantity_change: tx.qty,
        quantity_after:  qtyAfter,
        performed_by:    users[tx.by].id,
        notes:           tx.notes,
      });
      extraTxnCount++;
    }
  }
  console.log(`   ${extraTxnCount} additional stock transactions`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Table                    Rows seeded');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  role                     4 (system roles)');
  console.log('  region                  10');
  console.log('  user                    10  (1 admin, 3 SM, 3 IM, 3 DW)');
  console.log('  product_category        10');
  console.log('  unit_of_measure         10');
  console.log('  product                 10');
  console.log('  pricing                 20  (2 per product: FY25 + FY26)');
  console.log('  customer                10');
  console.log('  stock_on_hand           10  (adjusted after damage/adj)');
  console.log('  stock_reserved          10');
  console.log('  stock_transaction      ~40  (opening + dispatch + reserved + damage + adj)');
  console.log('  inward_entry            10');
  console.log('  inward_item            ~20  (2 per inward)');
  console.log('  order                   10');
  console.log('  order_item             ~23');
  console.log('  order_status_history   ~22  (full status trail)');
  console.log('  challan                  5  (approved/dispatched orders only)');
  console.log('  reorder_flag            10');
  console.log('  stock_damaged           10  (with stock_on_hand deducted)');
  console.log('  inventory_adjustment    10  (mix of + / - corrections)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  All passwords: Password@123');
  console.log('\n  IM page coverage:');
  console.log('  /inventory/stock        → 10 products with on_hand / reserved / damaged');
  console.log('  /inventory/stock/low    → products below reorder_threshold (threshold=20)');
  console.log('  /inventory/transactions → ~40 ledger rows across all 6 types');
  console.log('  /inventory/damaged      → 10 damage incidents, 3 IMs, varied reasons');
  console.log('  /inventory/adjustments  → 10 adjustments (7 with approver, 3 self-approved)');
  console.log('\n  Order flow illustrated:');
  console.log('  ORD-0001  PENDING→APPROVED→DISPATCHED  (complete cycle)');
  console.log('  ORD-0002  PENDING→APPROVED              (challan ready, awaiting dispatch)');
  console.log('  ORD-0004  PENDING                       (freshly submitted by SM)');
  console.log('  ORD-0006  PENDING→FLAGGED               (IM flagged stock issue)');
  console.log('  ORD-0009  PENDING→CANCELLED             (SM cancelled)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sequelize.close();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
