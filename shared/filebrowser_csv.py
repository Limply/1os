"""
Read/write CSV files stored on FileBrowser as lightweight data stores.
Reuses the same auth pattern as FileBrowserStorage.
"""
import csv
import io
import requests
from decouple import config

_BASE = config('FILEBROWSER_URL', 'https://files.sim-eng.com').rstrip('/')
_USER = config('FILEBROWSER_USER', '1os-api')
_PASS = config('FILEBROWSER_PASS', '')
_token = None


def _login():
    global _token
    res = requests.post(f'{_BASE}/api/login', json={'username': _USER, 'password': _PASS}, timeout=10)
    res.raise_for_status()
    _token = res.text.strip('"')


def _headers():
    global _token
    if not _token:
        _login()
    return {'X-Auth': _token}


def read_csv(path):
    """Read a CSV file from FileBrowser. Returns list of dicts. Returns [] if file not found."""
    global _token
    for attempt in range(2):
        res = requests.get(f'{_BASE}/api/raw/{path.lstrip("/")}', headers=_headers(), timeout=10)
        if res.status_code == 401 and attempt == 0:
            _login()
            continue
        if res.status_code == 404:
            return []
        res.raise_for_status()
        reader = csv.DictReader(io.StringIO(res.text.lstrip('﻿')))
        return [row for row in reader]
    return []


def write_csv(path, rows, fieldnames):
    """Write list of dicts back to a CSV file on FileBrowser, creating it if needed."""
    global _token
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)
    content = buf.getvalue().encode('utf-8')

    url = f'{_BASE}/api/resources/{path.lstrip("/")}?override=true'

    for attempt in range(2):
        res = requests.post(url, headers=_headers(), data=content, timeout=30)
        if res.status_code == 401 and attempt == 0:
            _login()
            continue
        if res.status_code in (200, 201, 204):
            return
        res.raise_for_status()
