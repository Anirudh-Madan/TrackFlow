const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a clean PDF document for a Delivery Challan.
 * @param {Object} data - Challan, Order, Customer, Items data
 * @returns {Promise<{ pdfBuffer: Buffer, filePath: string, fileName: string }>}
 */
async function generateChallanPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const {
        challan_number,
        order_number,
        party_name,
        created_at,
        generated_at,
        grand_total,
        vehicle_number,
        driver_name,
        driver_phone,
        region_name,
        items = []
      } = data;

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        
        // Ensure upload directory exists
        const uploadDir = path.join(__dirname, '../uploads/challans');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFileName = `${challan_number || 'CHN-DOC'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(uploadDir, safeFileName);
        
        fs.writeFileSync(filePath, pdfBuffer);

        resolve({
          pdfBuffer,
          filePath,
          fileName: safeFileName
        });
      });

      // ── 1. HEADER & BRANDING ───────────────────────────────────────────────
      doc.fillColor('#1e293b')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('TRACKFLOW ERP', 40, 40);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('Inventory & Order Fulfillment System', 40, 65);

      // Document Title Badge
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text('DELIVERY CHALLAN', 380, 40, { align: 'right' });

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#64748b')
         .text(`Generated: ${new Date(generated_at || created_at || Date.now()).toLocaleDateString('en-IN')}`, 380, 62, { align: 'right' });

      // Horizontal Divider
      doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // ── 2. METADATA CARDS (Two Columns) ────────────────────────────────────
      const col1X = 40;
      const col2X = 300;
      let currentY = 100;

      // Left Column — Challan & Order Info
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('CHALLAN DETAILS', col1X, currentY);
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Challan Number: ${challan_number || 'N/A'}`, col1X, currentY + 16);
      doc.text(`Order Number:   ${order_number || 'N/A'}`, col1X, currentY + 30);
      doc.text(`Region:         ${region_name || 'General'}`, col1X, currentY + 44);

      // Right Column — Party / Customer Info
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('CUSTOMER / PARTY', col2X, currentY);
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Party Name: ${party_name || 'Customer'}`, col2X, currentY + 16);
      doc.text(`Vehicle No: ${vehicle_number || 'N/A'}`, col2X, currentY + 30);
      doc.text(`Driver:     ${driver_name || 'N/A'} ${driver_phone ? '(' + driver_phone + ')' : ''}`, col2X, currentY + 44);

      currentY += 75;

      // Divider
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#e2e8f0').lineWidth(1).stroke();
      currentY += 15;

      // ── 3. LINE ITEMS TABLE HEADER ──────────────────────────────────────────
      doc.rect(40, currentY, 515, 24).fill('#f1f5f9');
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
      doc.text('S.NO', 48, currentY + 7);
      doc.text('PART / ITEM DESCRIPTION', 90, currentY + 7);
      doc.text('QTY', 360, currentY + 7, { align: 'right' });
      doc.text('PRICE', 440, currentY + 7, { align: 'right' });
      doc.text('AMOUNT', 545, currentY + 7, { align: 'right' });

      currentY += 28;

      // ── 4. TABLE ROWS ──────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      let itemIndex = 1;
      let computedTotal = 0;

      for (const item of items) {
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        const qty = parseFloat(item.quantity || item.quantity_received || 0);
        const price = parseFloat(item.base_price || item.sm_price || item.dl_price || 0);
        const lineTotal = qty * price;
        computedTotal += lineTotal;

        const partCode = item.part_number || item.sku || (item.product ? item.product.sku : '');
        const desc = item.description || (item.product ? item.product.name : 'Part Item');

        doc.text(String(itemIndex++), 48, currentY);
        doc.text(`${partCode ? partCode + ' - ' : ''}${desc}`, 90, currentY, { width: 250 });
        doc.text(String(qty), 360, currentY, { align: 'right' });
        doc.text(`₹${price.toFixed(2)}`, 440, currentY, { align: 'right' });
        doc.text(`₹${lineTotal.toFixed(2)}`, 545, currentY, { align: 'right' });

        currentY += 20;
        doc.moveTo(40, currentY - 4).lineTo(555, currentY - 4).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      }

      currentY += 10;

      // ── 5. SUMMARY & GRAND TOTAL ───────────────────────────────────────────
      const totalAmount = grand_total ? parseFloat(grand_total) : computedTotal;

      doc.rect(340, currentY, 215, 30).fill('#2563eb');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('TOTAL AMOUNT:', 350, currentY + 9);
      doc.text(`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 545, currentY + 9, { align: 'right' });

      currentY += 50;

      // ── 6. SIGNATURE BLOCK ──────────────────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#64748b');
      doc.text('Prepared By: Inventory Manager', 40, currentY);
      doc.text('Received By: Dispatch Worker / Driver Signature', 300, currentY, { align: 'right' });
      doc.moveTo(320, currentY - 10).lineTo(555, currentY - 10).strokeColor('#cbd5e1').stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateChallanPDF };
