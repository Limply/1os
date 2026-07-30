#!/usr/bin/env python3
"""1OS clock-in flow E2E test — logs in and actually submits a Clock In (or Clock Out).

Unlike smoke_test.py, this DOES submit a form: it will create/update a real
Attendance record (with an uploaded photo) for the test account against the
live prod DB. Only run this against an account you're OK writing test data for.

Usage:
    Fill in TEST_PASSWORD in clockin_test.env, then:
    ../../venv/bin/python clockin_test.py
"""
import sys
from pathlib import Path

from decouple import Config, RepositoryEnv
from playwright.sync_api import sync_playwright

ENV_PATH = Path(__file__).parent / "clockin_test.env"
if not ENV_PATH.exists():
    sys.exit(f"Missing {ENV_PATH}")
config = Config(RepositoryEnv(str(ENV_PATH)))

BASE_URL = config("TEST_BASE_URL").rstrip("/")
EMAIL = config("TEST_EMAIL")
PASSWORD = config("TEST_PASSWORD")

if not PASSWORD:
    sys.exit(f"TEST_PASSWORD is empty in {ENV_PATH} — fill it in first.")

# Somewhere in Singapore (Astronic office area) — doesn't need to be a real geofence
# since the whole point of this session's fix is that clock-in works without one.
FAKE_LAT, FAKE_LNG = 1.3521, 103.8198

results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-device-for-media-stream",
                "--use-fake-ui-for-media-stream",
            ],
        )
        context = browser.new_context(permissions=["geolocation", "camera"], geolocation={"latitude": FAKE_LAT, "longitude": FAKE_LNG})
        page = context.new_page()
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        # --- Login ---
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("load")
        page.wait_for_timeout(500)
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PASSWORD)
        page.click('button:has-text("Sign In")')
        try:
            page.wait_for_url(lambda url: "/login" not in url, timeout=8000)
            record("Login", True)
        except Exception as e:
            record("Login", False, str(e))
            browser.close()
            return print_summary()

        # --- Go to staff clock-in link ---
        page.goto(f"{BASE_URL}/staff/clock-in")
        page.wait_for_load_state("load")
        page.wait_for_timeout(1000)
        record("Page: /staff/clock-in loads", "/login" not in page.url, page.url)

        # --- Schedule banner (informational — should not block clock-in) ---
        body_text = page.inner_text("body")
        has_no_schedule_banner = "no schedule assigned" in body_text.lower()
        record("Schedule banner state", True, "no schedule for today (expected/OK)" if has_no_schedule_banner else "schedule found for today")

        # --- GPS ---
        try:
            page.click('button:has-text("Get GPS Location")')
            page.wait_for_timeout(2000)
            gps_ok = "±" in page.inner_text("body")
            record("GPS capture", gps_ok)
        except Exception as e:
            record("GPS capture", False, str(e))

        # --- Camera + photo ---
        try:
            page.click('button:has-text("Open Camera")')
            page.wait_for_timeout(1500)
            page.click('button:has-text("Take Photo")')
            page.wait_for_timeout(500)
            record("Photo capture", True)
        except Exception as e:
            record("Photo capture", False, str(e))

        # --- Determine clock in vs out ---
        is_clock_out = page.locator('button:has-text("Clock Out")').count() > 0
        action_label = "Clock Out" if is_clock_out else "Clock In"

        btn = page.locator(f'button:has-text("{action_label}")').last
        disabled = btn.is_disabled()
        record(f"{action_label} button enabled", not disabled)

        if disabled:
            record(f"{action_label} submit", False, "button stayed disabled, skipped submit")
            browser.close()
            return print_summary()

        console_errors.clear()
        btn.click()
        page.wait_for_timeout(3000)
        body_text = page.inner_text("body")
        success = "accepted" in body_text.lower()
        detail = ""
        if not success:
            detail = body_text[-300:]
        if console_errors:
            detail = (detail + "; " if detail else "") + f"console errors: {console_errors[:3]}"
        record(f"{action_label} submit", success, detail)

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
