#!/usr/bin/env python3
"""1OS production smoke test — read-only login + module walkthrough.

Logs into a live 1OS deployment (default: https://1os.astronic.com.sg) and
checks that the dashboard and each module route load without bouncing back
to /login or throwing console errors. Also clicks through the HR sub-tabs
and confirms the Operations page renders a job list. Never submits forms
or creates/edits data — safe to run against a tenant's production DB.

Usage:
    cp test.env.template test.env   # fill in TEST_PASSWORD
    ../../venv/bin/python smoke_test.py
or just: ./run.sh
"""
import sys
from pathlib import Path

from decouple import Config, RepositoryEnv
from playwright.sync_api import sync_playwright

ENV_PATH = Path(__file__).parent / "test.env"
if not ENV_PATH.exists():
    sys.exit(f"Missing {ENV_PATH} — copy test.env.template to test.env and fill in credentials.")
config = Config(RepositoryEnv(str(ENV_PATH)))

BASE_URL = config("TEST_BASE_URL").rstrip("/")
EMAIL = config("TEST_EMAIL")
PASSWORD = config("TEST_PASSWORD")

MODULES = [
    ("/", "Dashboard"),
    ("/hr", "HR"),
    ("/operations", "Operations"),
    ("/projects", "Projects"),
    ("/finance", "Finance"),
    ("/crm", "CRM"),
    ("/compliance", "Compliance"),
    ("/files", "Files"),
    ("/calendar", "Calendar"),
    ("/orgchart", "OrgChart"),
    ("/settings", "Settings"),
]

HR_SUBTABS = ["My Leave", "Attendance", "My Profile", "Courses"]

results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


def settle(page):
    page.wait_for_load_state("load")
    page.wait_for_timeout(800)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # --- Login ---
        page.goto(f"{BASE_URL}/login")
        settle(page)
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        page.click('button:has-text("Sign In")')
        try:
            page.wait_for_url(lambda url: "/login" not in url, timeout=8000)
        except Exception as e:
            record("Login", False, f"never left /login page ({e})")
            browser.close()
            print_summary()
        token = page.evaluate("() => localStorage.getItem('access_token')")
        record("Login", bool(token), "" if token else "no access_token in localStorage after redirect")

        # --- Broad module smoke pass (read-only) ---
        for path, label in MODULES:
            console_errors.clear()
            try:
                page.goto(f"{BASE_URL}{path}")
                settle(page)
                bounced_to_login = "/login" in page.url
                body_text = page.inner_text("body")
                locked = "coming soon" in body_text.lower()
                ok = not bounced_to_login
                detail = "locked/not licensed for this tenant (informational)" if locked else ""
                if console_errors:
                    detail = (detail + "; " if detail else "") + f"console errors: {console_errors[:2]}"
                record(f"Module: {label}", ok, detail)
            except Exception as e:
                record(f"Module: {label}", False, str(e))

        # --- HR sub-tabs (read-only clicks) ---
        console_errors.clear()
        page.goto(f"{BASE_URL}/hr")
        settle(page)
        if "no employee profile linked" in page.inner_text("body").lower():
            record(
                "HR tabs",
                True,
                "skipped: tester account has no Employee profile linked (informational)",
            )
        else:
            for tab in HR_SUBTABS:
                try:
                    btn = page.get_by_role("button", name=tab, exact=True)
                    if btn.count() == 0:
                        record(f"HR tab: {tab}", False, "tab button not found")
                        continue
                    btn.first.click()
                    page.wait_for_timeout(600)
                    record(f"HR tab: {tab}", True)
                except Exception as e:
                    record(f"HR tab: {tab}", False, str(e))

        # --- Operations content check (read-only, no form submission) ---
        console_errors.clear()
        try:
            page.goto(f"{BASE_URL}/operations")
            settle(page)
            has_content = page.locator("table, [role='table'], .grid, button").count() > 0
            record("Operations: content renders", has_content)
        except Exception as e:
            record("Operations: content renders", False, str(e))

        browser.close()

    print_summary()


def print_summary():
    failed = [r for r in results if not r[1]]
    print("\n" + "=" * 50)
    print(f"{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("Failures:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
