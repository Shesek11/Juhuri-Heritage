"""Test live site after schema restructure."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import os

SCREENSHOTS_DIR = '/tmp/site-test'
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})

    # 1. Homepage
    print("=== 1. Homepage ===")
    page.goto('https://jun-juhuri.com/', wait_until='networkidle', timeout=30000)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/01-homepage.png', full_page=False)
    title = page.title()
    print(f"Title: {title}")
    # Check word of the day widget
    wod = page.locator('text=מילה יומית').first
    if wod.is_visible():
        print("Word of the day widget: VISIBLE")
    else:
        print("Word of the day widget: NOT FOUND")

    # 2. Dictionary page
    print("\n=== 2. Dictionary Page ===")
    page.goto('https://jun-juhuri.com/dictionary', wait_until='networkidle', timeout=30000)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/02-dictionary.png', full_page=False)
    # Find search input
    search_input = page.locator('input[type="text"], input[type="search"], input[placeholder*="חפש"]').first
    if search_input.is_visible():
        print("Search bar: VISIBLE")
        # Type a search term
        search_input.fill('שלום')
        page.wait_for_timeout(2000)  # Wait for search results
        page.screenshot(path=f'{SCREENSHOTS_DIR}/03-search-results.png', full_page=False)
        # Check if results appeared
        results_text = page.content()
        if 'hebrewScript' in results_text or 'שלום' in results_text:
            print("Search results: APPEARED")
        else:
            print("Search results: CHECK SCREENSHOT")
    else:
        print("Search bar: NOT FOUND")

    # 3. Word page
    print("\n=== 3. Word Page (/word/קיי) ===")
    page.goto('https://jun-juhuri.com/word/%D7%A7%D7%99%D7%99', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)  # Wait for enrichment
    page.screenshot(path=f'{SCREENSHOTS_DIR}/04-word-page.png', full_page=False)

    # Check key elements
    content = page.content()
    checks = {
        'Hebrew heading (קיי)': 'קיי' in content,
        'Latin (key)': 'key' in content,
        'Cyrillic (кей)': 'кей' in content,
        'Hebrew meaning (מתי)': 'מתי' in content,
        'Russian (когда)': 'когда' in content,
        'AI badge': 'AI' in content,
    }
    for check, result in checks.items():
        print(f"  {check}: {'FOUND' if result else 'MISSING'}")

    # Scroll down to see more content
    page.evaluate('window.scrollBy(0, 600)')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/05-word-page-scroll.png', full_page=False)

    # 4. Search and click result
    print("\n=== 4. Search & Navigate ===")
    page.goto('https://jun-juhuri.com/dictionary', wait_until='networkidle', timeout=30000)
    search_input = page.locator('input[type="text"], input[type="search"], input[placeholder*="חפש"]').first
    if search_input.is_visible():
        search_input.fill('אימבורוז')
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/06-search-imburuz.png', full_page=False)

        # Try to click first result
        first_result = page.locator('[class*="cursor-pointer"], [role="button"]').first
        if first_result.is_visible():
            first_result.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/07-clicked-result.png', full_page=False)
            current_url = page.url
            print(f"Navigated to: {current_url}")
        else:
            print("No clickable result found")

    # 5. Word page for entry with more data
    print("\n=== 5. Word Page with data (BOVORİMİ) ===")
    page.goto('https://jun-juhuri.com/word/BOVORİMİ', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/08-bovorimi.png', full_page=False)

    browser.close()
    print(f"\nScreenshots saved to {SCREENSHOTS_DIR}/")
    print("Done!")
