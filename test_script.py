from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:5173")
    page.wait_for_timeout(2000)

    # Just click the Catalog Explorer tab if it exists
    page.get_by_text("Catalog Explorer").click()
    page.wait_for_timeout(1000)
    page.get_by_text("Rules Configuration").click()
    page.wait_for_timeout(1000)
    page.get_by_role("switch", name="Strict Only").click()
    page.wait_for_timeout(500)
    page.get_by_role("switch", name="Strict Only").click()
    page.wait_for_timeout(500)

    # Try focusing the strict only label to test focus-visible ring styles.
    page.get_by_role("switch", name="Strict Only").focus()

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
