"""
DOCX generation utility for Finance documents.
Returns a python-docx Document object — caller streams it as HTTP response.
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
import datetime

COMPANY_NAME    = 'Astronic Services & Trading Pte Ltd'
COMPANY_ADDRESS = '140 Upper Bukit Timah Road #07-03 Beauty World Plaza Singapore 588176'
COMPANY_TEL     = '+65 6123 4567'
COMPANY_GST     = 'GST Reg No: M90364958K'


def _header(doc, title, doc_no, issue_date, client_name, client_address=None, extra_rows=None):
    """Add company header + document title + client block."""
    # Company name
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(COMPANY_NAME)
    run.bold = True
    run.font.size = Pt(14)

    for line in [COMPANY_ADDRESS, COMPANY_TEL, COMPANY_GST]:
        p = doc.add_paragraph(line)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.runs[0].font.size = Pt(9)

    doc.add_paragraph()

    # Document title
    p = doc.add_paragraph(title)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].bold = True
    p.runs[0].font.size = Pt(13)

    doc.add_paragraph()

    # Info table
    table = doc.add_table(rows=0, cols=4)
    table.style = 'Table Grid'

    def add_row(label1, val1, label2='', val2=''):
        row = table.add_row().cells
        row[0].text = label1
        row[0].paragraphs[0].runs[0].bold = True
        row[1].text = str(val1)
        row[2].text = label2
        if label2:
            row[2].paragraphs[0].runs[0].bold = True
        row[3].text = str(val2)

    add_row(f'{title} No.', doc_no, 'Date', str(issue_date))
    add_row('Client', client_name)
    if client_address:
        add_row('Address', client_address)
    if extra_rows:
        for r in extra_rows:
            add_row(*r)

    doc.add_paragraph()


def _items_table(doc, headers, rows, totals=None):
    """Add a line items table."""
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Table Grid'

    # Header row
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        hdr[i].paragraphs[0].runs[0].bold = True
        hdr[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Data rows
    for row_data in rows:
        row = table.add_row().cells
        for i, val in enumerate(row_data):
            row[i].text = str(val) if val is not None else ''

    # Totals
    if totals:
        for label, value in totals:
            row = table.add_row().cells
            span = len(headers) - 2
            row[span].text = label
            row[span].paragraphs[0].runs[0].bold = True
            row[span].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
            row[span + 1].text = f'${value:,.2f}'


def generate_quotation(quotation):
    doc = Document()
    _header(
        doc, 'QUOTATION',
        quotation.quote_no,
        quotation.issue_date,
        quotation.client_name,
        quotation.client_address,
        extra_rows=[
            ('Valid Until', str(quotation.valid_until or '—'), 'Status', quotation.status.upper()),
        ]
    )

    headers = ['No.', 'Description', 'Unit', 'Qty', 'Unit Price (S$)', 'Amount (S$)']
    rows = []
    for i, item in enumerate(quotation.items.all(), 1):
        rows.append([i, item.description, item.unit or '', item.qty, f'{item.unit_price:,.2f}', f'{item.amount:,.2f}'])

    totals = [
        ('Subtotal', quotation.subtotal),
        ('GST (9%)', quotation.gst_amount),
        ('Total', quotation.total),
    ]
    _items_table(doc, headers, rows, totals)

    if quotation.notes:
        doc.add_paragraph()
        doc.add_paragraph(f'Notes: {quotation.notes}')

    _footer(doc, quotation.prepared_by)
    return doc


def generate_invoice(invoice):
    doc = Document()
    _header(
        doc, 'INVOICE',
        invoice.invoice_no,
        invoice.issue_date,
        invoice.client_name,
        extra_rows=[
            ('Due Date', str(invoice.due_date), 'Status', invoice.status.upper()),
        ]
    )

    headers = ['No.', 'Description', 'Unit', 'Qty', 'Unit Price (S$)', 'Amount (S$)']
    rows = []
    for i, item in enumerate(invoice.items.all(), 1):
        rows.append([i, item.description, item.unit or '', item.qty, f'{item.unit_price:,.2f}', f'{item.amount:,.2f}'])

    totals = [
        ('Subtotal', invoice.subtotal),
        ('GST (9%)', invoice.gst_amount),
        ('Total', invoice.total),
        ('Paid', invoice.paid_amount),
        ('Balance Due', invoice.balance_due),
    ]
    _items_table(doc, headers, rows, totals)

    if invoice.notes:
        doc.add_paragraph()
        doc.add_paragraph(f'Notes: {invoice.notes}')

    _footer(doc)
    return doc


def generate_delivery_order(do):
    doc = Document()
    _header(
        doc, 'DELIVERY ORDER',
        do.do_no,
        do.issue_date,
        do.client_name,
        do.delivery_address,
        extra_rows=[
            ('Delivery Date', str(do.delivery_date or '—'), 'Status', do.status.upper()),
            ('Delivered By', do.delivered_by or '—', 'Received By', do.received_by or '—'),
        ]
    )

    headers = ['No.', 'Description', 'Unit', 'Qty', 'Remarks']
    rows = []
    for i, item in enumerate(do.items.all(), 1):
        rows.append([i, item.description, item.unit or '', item.qty, item.remarks or ''])

    _items_table(doc, headers, rows)

    doc.add_paragraph()
    # Signature block
    sig = doc.add_table(rows=3, cols=2)
    sig.rows[0].cells[0].text = 'Delivered by (Signature / Name):'
    sig.rows[0].cells[1].text = 'Received by (Signature / Name / Date):'
    sig.rows[2].cells[0].text = f'{do.delivered_by or ""}'
    sig.rows[2].cells[1].text = f'{do.received_by or ""}'

    if do.notes:
        doc.add_paragraph()
        doc.add_paragraph(f'Notes: {do.notes}')

    _footer(doc, do.prepared_by)
    return doc


def _footer(doc, prepared_by=None):
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run(f'Generated by 1OS on {datetime.date.today()}')
    p.runs[0].font.size = Pt(8)
    p.runs[0].font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    if prepared_by:
        p.add_run(f'  |  Prepared by: {prepared_by.full_name}')
        p.runs[-1].font.size = Pt(8)
