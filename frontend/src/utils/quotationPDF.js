import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

let _tenantCache = null

async function getTenant() {
  if (_tenantCache) return _tenantCache
  try {
    const res = await fetch('/api/auth/tenant-info/')
    _tenantCache = await res.json()
  } catch {
    _tenantCache = {}
  }
  return _tenantCache
}

const SGD = (n) =>
  '$' + parseFloat(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Shared header (printed on every page) ───────────────────────────────────
function drawHeader(doc, co) {
  const W = doc.internal.pageSize.getWidth()

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text((co.name || '').toUpperCase(), 14, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (co.address) doc.text(co.address, 14, 19)
  const line2 = [co.phone && `Tel: ${co.phone}`, co.email && `Email: ${co.email}`].filter(Boolean).join('   ')
  if (line2) doc.text(line2, 14, 23.5)
  const line3 = [co.site_url && `Web: ${co.site_url}`, co.uen && `UEN: ${co.uen}`].filter(Boolean).join('   ')
  if (line3) doc.text(line3, 14, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 30, 30)
  doc.text('QUOTATION', W - 14, 19, { align: 'right' })

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(14, 32, W - 14, 32)
}

// ─── Quote meta block (To / Submitted To / Quote # / Date) ───────────────────
function drawMeta(doc, q) {
  const W = doc.internal.pageSize.getWidth()
  let y = 38

  // Left: To / Submitted To
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')

  doc.text('To :', 14, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(q.client_name || '', 26, y)

  y += 5.5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Submitted To :', 14, y)
  const submittedTo = [q.client_contact, q.client_address].filter(Boolean).join('  |  ')
  const lines = doc.splitTextToSize(submittedTo || q.client_name, 100)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.text(lines, 44, y)

  // Right: Quote # / Date
  const rx = W - 14
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.setFontSize(8)
  doc.text('QUOTE #', rx - 40, 38, { align: 'left' })
  doc.text('QUOTE DATE', rx - 40, 43.5, { align: 'left' })
  doc.setTextColor(30, 30, 30)
  doc.text(q.quote_no || '', rx, 38, { align: 'right' })
  doc.text(fmtDate(q.issue_date), rx, 43.5, { align: 'right' })

  return y + (lines.length - 1) * 4.5 + 6
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function generateQuotationPDF(q) {
  const co = await getTenant()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // ── Page 1: header + meta + items ──────────────────────────────────────────
  drawHeader(doc, co)
  const tableStartY = drawMeta(doc, q)

  const items = q.items || []

  // Build table rows
  const rows = items.map((item, i) => [
    String(i + 1),
    item.description || '',
    item.unit ? `${item.qty} ${item.unit}` : item.qty ? String(item.qty) : '1 lot',
    SGD(item.amount),
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['No.', 'Description of Works', 'Qty', 'Amount']],
    body: rows,
    foot: [[
      '', '', 'TOTAL S$',
      SGD(q.total),
    ]],
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, valign: 'top' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader(doc, co)
      const pH = doc.internal.pageSize.getHeight()
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.line(14, pH - 12, W - 14, pH - 12)
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.setFont('helvetica', 'normal')
      const footerParts = [co.address, co.phone && `Tel: ${co.phone}`, co.email && `Email: ${co.email}`, co.uen && `UEN: ${co.uen}`].filter(Boolean).join('   ')
      doc.text(footerParts, W / 2, pH - 8, { align: 'center' })
      doc.text(`Page ${data.pageNumber}`, W - 14, pH - 8, { align: 'right' })
    },
  })

  // ── Remarks ──────────────────────────────────────────────────────────────────
  let afterTableY = doc.lastAutoTable.finalY + 6

  const pH = doc.internal.pageSize.getHeight()
  const remarks = []
  if (items.length > 0) {
    remarks.push(
      'The supplied items will be covered by 1-year manufacturer\'s warranty.',
      'This quotation is valid for 30 days from the date of issue.',
      `PayNow to UEN ${co.uen || ''}${co.name ? ` (${co.name})` : ''}`.trim(),
      'Net 30 days from the date of invoice.',
    )
  }
  if (q.notes) remarks.push(q.notes)

  if (remarks.length > 0 && afterTableY < pH - 40) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Remarks:', 14, afterTableY)
    afterTableY += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    remarks.forEach((line) => {
      doc.text(`• ${line}`, 17, afterTableY)
      afterTableY += 5
    })
  }

  // ── Page 2: Acceptance of Quotation ──────────────────────────────────────────
  doc.addPage()
  drawHeader(doc, co)

  let ay = 42

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Acceptance of Quotation', 14, ay)

  ay += 7
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    'By signing below, the customer acknowledges acceptance of this quotation and agrees to the terms and conditions stated herein.',
    14, ay, { maxWidth: W - 28 }
  )

  ay += 14

  const col1 = 14
  const col2 = W / 2 + 5

  const signBlock = (x, name, designation, startY) => {
    const fields = [
      ['Authorised Signatory', name || ''],
      ['Name', ''],
      ['Designation', designation || ''],
      ['Date', ''],
    ]
    fields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text(`${label}:`, x, startY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      if (value) {
        doc.text(value, x + 38, startY)
      } else {
        doc.setDrawColor(160, 160, 160)
        doc.setLineWidth(0.3)
        doc.line(x + 38, startY + 0.5, x + 85, startY + 0.5)
      }
      startY += 7
    })
    return startY
  }

  const clientTitle = `FOR AND ON BEHALF OF\n${(q.client_name || '').toUpperCase()}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(clientTitle, col1, ay)

  const coTitle = `FOR AND ON BEHALF OF\n${(co.name || '').toUpperCase()}`
  doc.text(coTitle, col2, ay)

  ay += 12

  const signatoryName = co.signatory_name || ''
  const signatoryDesig = co.signatory_designation || ''
  signBlock(col1, '', '', ay)
  let seBlockEnd = signBlock(col2, signatoryName, signatoryDesig, ay)

  // Signature image (if uploaded)
  if (co.signatory_file) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = co.signatory_file
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', col2, seBlockEnd - 30, 40, 15)
    } catch { /* skip if image fails */ }
  }

  // Yours faithfully
  const finalY = doc.internal.pageSize.getHeight() - 30
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  doc.text('Yours faithfully,', col2, finalY)
  doc.setFont('helvetica', 'bold')
  doc.text((co.name || '').toUpperCase(), col2, finalY + 5)

  // Page 2 footer
  const pH2 = doc.internal.pageSize.getHeight()
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(14, pH2 - 12, W - 14, pH2 - 12)
  doc.setFontSize(7)
  doc.setTextColor(120)
  doc.setFont('helvetica', 'normal')
  const footerParts2 = [co.address, co.phone && `Tel: ${co.phone}`, co.email && `Email: ${co.email}`, co.uen && `UEN: ${co.uen}`].filter(Boolean).join('   ')
  doc.text(footerParts2, W / 2, pH2 - 8, { align: 'center' })
  doc.text('Page 2', W - 14, pH2 - 8, { align: 'right' })

  doc.save(`${q.quote_no || 'Quotation'}.pdf`)
}
