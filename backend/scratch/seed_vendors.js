/**
 * seed_vendors.js — seeds 5 realistic Indian vendors into the vendor table.
 * Safe to re-run (uses findOrCreate on GST).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/database');
const { Vendor, VendorContact } = require('../models');

const vendorDefs = [
  {
    company_name: 'Bharat Auto Parts Pvt. Ltd.',
    gst: '29AABCB1234F1ZP',
    remarks: 'Primary supplier for engine components',
    contacts: [{ name: 'Sudhir Bhat', phone: '9845001001', designation: 'Sales Head' }],
  },
  {
    company_name: 'Krishna Industrial Supplies',
    gst: '27AADCK5678G1ZQ',
    remarks: 'Bulk supplier for filters and belts',
    contacts: [{ name: 'Ramesh Kulkarni', phone: '9820002002', designation: 'Account Manager' }],
  },
  {
    company_name: 'Apex Automotive Components',
    gst: '36AABCA9012H1ZR',
    remarks: 'Preferred vendor for brake systems',
    contacts: [{ name: 'Pradeep Rao', phone: '9849003003', designation: 'GM Sales' }],
  },
  {
    company_name: 'Shree Ganesh Traders',
    gst: '33AAACS3456I1ZS',
    remarks: 'Local Chennai supplier — fast delivery',
    contacts: [{ name: 'Murugan S', phone: '9444004004', designation: 'Proprietor' }],
  },
  {
    company_name: 'Delta Precision Parts',
    gst: '07AABCD7890J1ZT',
    remarks: 'Specialises in precision machined parts',
    contacts: [{ name: 'Amit Sharma', phone: '9810005005', designation: 'Director' }],
  },
];

async function seed() {
  await sequelize.authenticate();
  console.log('✅  DB connected');

  for (const v of vendorDefs) {
    const [vendor, created] = await Vendor.findOrCreate({
      where: { gst: v.gst },
      defaults: { company_name: v.company_name, gst: v.gst, remarks: v.remarks },
    });
    if (created) {
      console.log(`   ✔  Created vendor: ${v.company_name}`);
      for (const c of v.contacts) {
        await VendorContact.findOrCreate({
          where: { vendor_id: vendor.id, name: c.name },
          defaults: { vendor_id: vendor.id, ...c },
        });
      }
    } else {
      console.log(`   ⚠  Vendor already exists: ${v.company_name}`);
    }
  }

  console.log('\n✅  Vendor seed complete');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
