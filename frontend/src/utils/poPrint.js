/**
 * Centralized Purchase Order PDF & Print Generator
 * Formatted to match Shree Ramdev Motors Purchase Order template.
 */

export function formatDateDDMMYYYY(d) {
  if (!d) {
    const dt = new Date();
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${dt.getFullYear()}`;
  }
  if (typeof d === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(d)) return d;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${dt.getFullYear()}`;
}

export function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getPOHTML(poData, userContext = null) {
  const poNo = poData.po_number || poData.poNo || (poData.id ? String(poData.id).replace('PO-', '') : '') || 'PO-1001';
  const rawDate = poData.po_date || poData.date || poData.created_at;
  const dateStr = formatDateDDMMYYYY(rawDate);

  const vendorName = poData.vendor_name || poData.vendor?.company_name || poData.supplier || '—';
  const vendorGst  = poData.vendor_gst || poData.vendor?.gst || '—';
  const preparedBy = poData.prepared_by || poData.creator?.name || userContext?.name || 'Inventory Manager';
  const notes      = poData.notes || '';

  const rawItems = poData.items || [];
  const validItems = rawItems.filter(it => it.product_id || it.part_number || it.sku || it.description || it.name);

  let grandTotal = 0;
  const rowsHtml = validItems.map((it, idx) => {
    const sr = idx + 1;
    const partNo = it.part_number || it.sku || it.product?.sku || '—';
    const description = it.description || it.name || it.product?.name || '—';
    const qty = parseInt(it.qty || it.quantity || 1);
    const price = parseFloat(it.unit_price ?? it.price ?? it.base_price ?? it.product?.dealer_landing_price ?? 0);
    const lineTotal = qty * price;
    grandTotal += lineTotal;

    return `
      <tr>
        <td style="font-weight: 500; color: #475569;">${sr}</td>
        <td style="font-weight: 600; font-family: 'Inter', monospace;">${partNo}</td>
        <td style="color: #1e293b;">${description}</td>
        <td class="num">${qty}</td>
        <td class="num">₹${formatCurrency(price)}</td>
        <td class="num">₹${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const displayTotal = poData.total_amount || poData.grand_total ? parseFloat(poData.total_amount || poData.grand_total) : grandTotal;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Purchase Order #${poNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 13px;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .company-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .company-sub {
          font-size: 12px;
          font-weight: 500;
          color: #334155;
          margin: 2px 0;
        }
        .po-box-container {
          text-align: right;
        }
        .po-no-box {
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          padding: 4px 16px;
          display: inline-block;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .po-date {
          font-size: 12px;
          font-weight: 500;
          color: #0f172a;
        }
        .header-divider {
          border-top: 2px solid #0f172a;
          margin: 16px 0 24px 0;
        }
        .doc-title {
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #0f172a;
          margin: 0 0 28px 0;
          text-transform: uppercase;
        }
        .vendor-info-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .info-block-left {
          text-align: left;
        }
        .info-block-right {
          text-align: right;
        }
        .info-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .info-val {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
        }
        table.items-table th {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        table.items-table th.num { text-align: right; }
        table.items-table td {
          padding: 12px 0;
          font-size: 13px;
          color: #0f172a;
          border-bottom: 1px solid #f3f4f6;
        }
        table.items-table td.num {
          text-align: right;
          font-weight: 600;
        }
        .summary-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 60px;
        }
        .sig-section {
          margin-left: auto;
          width: 220px;
          text-align: center;
          margin-top: 60px;
        }
        .sig-line {
          border-top: 1.5px solid #0f172a;
          margin-bottom: 6px;
        }
        .sig-label {
          font-size: 11px;
          font-weight: 600;
          color: #334155;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="top-header">
        <div>
          <div class="company-title">SHREE RAMDEV MOTORS</div>
          <div class="company-sub">OLD POWER HOUSE ROAD, BIKANER</div>
          <div class="company-sub">GSTIN: 08ALDPD3168N1ZW</div>
        </div>
        <div class="po-box-container">
          <div class="po-no-box">PO No. &nbsp; ${poNo}</div>
          <div class="po-date">Date: ${dateStr}</div>
        </div>
      </div>

      <div class="header-divider"></div>

      <div class="doc-title">PURCHASE ORDER</div>

      <div class="vendor-info-grid">
        <div class="info-block-left">
          <div class="info-label">SUPPLIER / VENDOR</div>
          <div class="info-val">${vendorName}</div>
          ${vendorGst !== '—' ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">GSTIN: ${vendorGst}</div>` : ''}
        </div>
        <div class="info-block-right">
          <div class="info-label">PREPARED BY</div>
          <div class="info-val">${preparedBy}</div>
        </div>
      </div>

      ${notes ? `<div style="margin-bottom: 20px; font-size: 12px; color: #475569; background: #f8fafc; padding: 10px 14px; border-radius: 8px;"><strong style="color: #0f172a;">Notes:</strong> ${notes}</div>` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">SR</th>
            <th style="width: 20%;">PART NUMBER</th>
            <th style="width: 40%;">DESCRIPTION</th>
            <th class="num" style="width: 10%;">QTY</th>
            <th class="num" style="width: 12.5%;">UNIT PRICE</th>
            <th class="num" style="width: 12.5%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="summary-grid">
        <div class="info-block-left">
          <div class="info-label" style="text-transform: none; font-size: 11px; font-weight: 500;">Status</div>
          <div class="info-val" style="font-size: 14px; text-transform: uppercase;">${poData.status || 'Active'}</div>
        </div>
        <div class="info-block-right">
          <div class="info-label" style="text-transform: none; font-size: 11px; font-weight: 500;">Total Amount</div>
          <div class="info-val" style="font-size: 16px;">₹${formatCurrency(displayTotal)}</div>
        </div>
      </div>

      <div class="sig-section">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signature</div>
      </div>
    </body>
    </html>
  `;
}

export function printPOPDF(poData, userContext = null) {
  const html = getPOHTML(poData, userContext);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print / save as PDF');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 350);
}
