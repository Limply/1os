"""
One-off script: import AppSheet CSV into 1OS projects (dev DB).
Run with: DJANGO_SETTINGS_MODULE=project_config.settings.dev venv/bin/python import_projects.py
"""
import os, sys, csv, re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_config.settings.dev')

import django
django.setup()

from services.auth.models import Tenant
from services.projects.models import Project

CSV_PATH = os.path.join(os.path.dirname(__file__), '4_1_Projects - 4_1_Projects.csv')


def parse_date(s):
    if not s or not s.strip():
        return None
    s = s.strip()

    # Excel serial (5-digit number)
    if re.fullmatch(r'\d{5}', s):
        return (date(1899, 12, 30) + timedelta(days=int(s)))

    for fmt in ('%m/%d/%Y', '%d-%b-%y', '%d-%b-%Y', '%d/%m/%Y', '%b-%y', '%b-%Y'):
        try:
            d = datetime.strptime(s, fmt).date()
            # sanity: reject obviously wrong years
            if d.year > 2030 or d.year < 2000:
                continue
            return d
        except ValueError:
            continue
    return None


def parse_amount(s):
    if not s or str(s).strip() in ('', '-', 'Closed', '0.01'):
        return None
    s = re.sub(r'[,$\s]', '', str(s))
    if not s:
        return None
    try:
        v = Decimal(s)
        return v if v != 0 else None
    except InvalidOperation:
        return None


def map_status(csv_status, phase):
    s = (csv_status or '').strip()
    p = (phase or '').strip()
    if s == 'Closed':
        return 'on_hold' if p == 'KIV' else 'completed'
    if s == 'Open':
        if p == 'Quotation Phase':
            return 'planning'
        if p == 'KIV':
            return 'on_hold'
        return 'active'
    return 'planning'


def map_type(name, client):
    n = (name or '').lower()
    c = (client or '').lower()
    if '[internal]' in n or c in ('se (internal)', 'simply engineering', 'se'):
        return 'internal'
    return 'client'


def main():
    tenant = Tenant.objects.first()
    if not tenant:
        print('ERROR: No tenant found.')
        sys.exit(1)

    seen_nos = set(Project.objects.values_list('project_no', flat=True))
    created = skipped = 0

    with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            project_id = (row.get('ProjectID') or '').strip()
            name       = (row.get('ProjectName') or '').strip()

            if not name:
                continue

            # Make project_no unique if duplicate in CSV
            base_no = project_id or None
            if base_no:
                if base_no in seen_nos:
                    suffix = 2
                    while f'{base_no}-{suffix}' in seen_nos:
                        suffix += 1
                    base_no = f'{base_no}-{suffix}'
            seen_nos.add(base_no or '')

            remarks_parts = [r for r in [row.get('Remarks','').strip(), row.get('PhaseID','').strip()] if r]

            try:
                p = Project(
                    tenant         = tenant,
                    project_no     = base_no or '',
                    name           = name[:255],
                    type           = map_type(name, row.get('ClientID','')),
                    status         = map_status(row.get('Status',''), row.get('PhaseID','')),
                    priority       = 'medium',
                    description    = (row.get('Description') or '').strip() or None,
                    remarks        = ' | '.join(remarks_parts) or None,
                    client_name    = (row.get('ClientID') or '').strip() or None,
                    start_date     = parse_date(row.get('StartDate','')),
                    end_date       = parse_date(row.get('EndDate','')),
                    partner        = (row.get('Partner 1') or '').strip() or None,
                    expenses       = parse_amount(row.get('Expenses_Parts','')),
                    quoted_amount  = parse_amount(row.get('Quote','')),
                    payment_received = parse_amount(row.get('Payment','')),
                    payment_record = (row.get('Payment Record') or '').strip() or None,
                    external_link  = (row.get('Link') or '').strip() or None,
                )
                # bypass auto project_no generation if we have one
                if p.project_no:
                    p._skip_no_gen = True
                p.save()
                created += 1
                print(f'  + {p.project_no or "(auto)"} — {p.name[:60]}')
            except Exception as e:
                print(f'  ! SKIP [{project_id}] {name[:50]}: {e}')
                skipped += 1

    print(f'\nDone: {created} imported, {skipped} skipped.')


if __name__ == '__main__':
    main()
