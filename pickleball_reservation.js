import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false }); // Change to true for background execution
  const page = await browser.newPage();

  // Load environment variables
  const username = process.env.WEBTRAC_USERNAME;
  const password = process.env.WEBTRAC_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Error: Username or password not set in environment variables."
    );
  }

  try {
    // Navigate to the login page
    await page.goto(
      "https://registration.fostercity.org/wbwsc/webtrac.wsc/login.html"
    );

    // Fill in login details
    await page.fill('input[name="weblogin_username"]', username);
    await page.fill('input[name="weblogin_password"]', password);

    // Click the login button
    await page.click('button[name="weblogin_buttonlogin"]');

    // Check if "Login Warning - Active Session Alert" is present
    const continueButton = await page
      .locator('button[id="loginresumesession_buttoncontinue"]')
      .first();

    if (await continueButton.isVisible()) {
      console.log("Warning detected! Clicking the continue button...");

      // Click the continue/proceed button
      await page.click('button[id="loginresumesession_buttoncontinue"]');
    } else {
      console.log("No active session warning detected.");
    }

    // Wait for navigation after login (adjust selector based on successful login indicator)
    await page.waitForURL("**/splash.html*");

    console.log("Login successful!");

    // Navigate to the reservation page
    await page.goto(
      "https://registration.fostercity.org/wbwsc/webtrac.wsc/search.html?display=detail&module=FR"
    );

    // Calculate date two weeks from today
    const today = new Date();
    const reservationDate = new Date(today);
    reservationDate.setDate(today.getDate() + 14);

    const month = reservationDate.getMonth();
    const day = reservationDate.getDate();
    const year = reservationDate.getFullYear();

    // Choose date and time
    await page.click('button[class="datepicker-button"]');

    // month
    await page.click('button[id="date_vm_8_month_selection_button"]');
    await page.click(`ul li[data-value="${month}"]`);

    // day
    await page.click('button[id="date_vm_8_day_selection_button"]');
    await page.click(`ul li[data-value="${day}"]`);

    // year
    await page.click('button[id="date_vm_8_year_selection_button"]');
    await page.click(`ul li[data-value="${year}"]`);

    // done
    await page.click("text=Done");

    // search
    await page.click('button[id="frwebsearch_buttonsearch"]');
    const courtNumber = 6;
    const courtSelector = `table:has(tbody td.label-cell[data-title="Facility Description"]:has-text("Pickleball Court ${courtNumber}")) a:has-text("4:00 pm - 5:00 pm")`;
    await page.waitForSelector(courtSelector);

    // select Pickleball Court 6, 4:00 PM - 5:00 PM
    await page.click(courtSelector);

    const addToCartSelector = 'text="Add To Cart"';
    await page.waitForSelector(addToCartSelector);
    await page.click(addToCartSelector);

    const warningSelector =
      'text="You have not satisfied any of the following Allowances."';

    // Wait until the warning is gone
    let count = 0;
    const maxWarningRetries = 200;
    const reloadInterval = 500;

    while (
      (await page.isVisible(warningSelector)) &&
      count < maxWarningRetries
    ) {
      count++;
      console.log(
        `Warning exists. Reloading... (${count}/${maxWarningRetries})`
      );
      await page.reload();
      await page.waitForTimeout(reloadInterval);
    }

    if (count >= maxWarningRetries) {
      throw new Error("Max retries reached. Exiting...");
    }

    // Reservation Purpose
    await page.fill('input[id="question10465917"]', "a");
    await page.click('button[id="processingprompts_buttoncontinue"]');

    // Checkout
    await page.click('a[id="webcart_buttoncheckout"]');

    // Continue
    await page.click('a[id="webcheckout_buttoncontinue"]');
    await page.waitForURL("**/confirmation.html*");

    console.log("Reservation confirmed!");
  } catch (error) {
    console.error("Error during reservation:", error);
  } finally {
    await page.screenshot({ path: "screenshot.png" });
    await browser.close();
  }
})();
