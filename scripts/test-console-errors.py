"""Capture client-side console errors."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})  # Mobile viewport

    errors = []
    page.on('console', lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ('error', 'warning') else None)
    page.on('pageerror', lambda err: errors.append(f"[PAGE ERROR] {err.message}"))

    print("=== Testing Homepage (mobile) ===")
    page.goto('https://jun-juhuri.com/', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/site-test/mobile-home.png')

    print("=== Testing Dictionary ===")
    page.goto('https://jun-juhuri.com/dictionary', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/site-test/mobile-dictionary.png')

    print("=== Testing Word Page ===")
    page.goto('https://jun-juhuri.com/word/%D7%A7%D7%99%D7%99', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path='/tmp/site-test/mobile-word.png')

    print(f"\n=== Console Errors/Warnings: {len(errors)} ===")
    for e in errors:
        print(e)

    browser.close()
