#!/bin/bash
# One-command runner for the 1OS E2E smoke test.
set -e
cd "$(dirname "$0")"
PLAYWRIGHT_BROWSERS_PATH=/opt/1os/.playwright /opt/1os/venv/bin/python3 smoke_test.py
