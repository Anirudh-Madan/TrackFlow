const fs = require('fs');
const text = fs.readFileSync('c:/Users/sreed/OneDrive/Desktop/TrackFlow/dummy_products_import.csv', 'utf8');
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
console.log(parseCSV(text));
