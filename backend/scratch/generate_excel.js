const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const csvPath = 'c:/Users/sreed/OneDrive/Desktop/TrackFlow/dummy_products_import.csv';
const xlsxPath = 'c:/Users/sreed/OneDrive/Desktop/TrackFlow/dummy_products_import.xlsx';

function parseCSV(text) {
  let p = '', c = '', r = [];
  let q = false;
  let row = [''];
  for (let i = 0; i < text.length; i++) {
    c = text[i];
    let next = text[i+1];
    if (c === '"') {
      if (q && next === '"') { row[row.length - 1] += '"'; i++; }
      else { q = !q; }
    } else if (c === ',' && !q) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !q) {
      if (c === '\r' && next === '\n') { i++; }
      r.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') { r.push(row); }
  const headers = r[0].map(h => h.trim().toLowerCase());
  return r.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ? row[i].trim() : ''; });
    return obj;
  });
}

async function main() {
  try {
    console.log('Reading CSV...');
    const text = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(text);
    console.log('Rows parsed:', rows);

    console.log('Writing Excel file using exceljs...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Add columns
    worksheet.columns = [
      { header: 'sku', key: 'sku' },
      { header: 'name', key: 'name' },
      { header: 'purchase_price', key: 'purchase_price' },
      { header: 'selling_price', key: 'selling_price' },
      { header: 'dealer_landing_price', key: 'dealer_landing_price' },
      { header: 'quantity', key: 'quantity' }
    ];

    // Add rows
    rows.forEach(r => worksheet.addRow(r));

    await workbook.xlsx.writeFile(xlsxPath);
    console.log('Excel file created successfully at:', xlsxPath);
    process.exit(0);
  } catch (err) {
    console.error('Error generating Excel file:', err);
    process.exit(1);
  }
}

main();
