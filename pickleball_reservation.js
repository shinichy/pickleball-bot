import { chromium } from "playwright";

(async () => {
  // Load environment variables
  const username = process.env.WEBTRAC_USERNAME;
  const password = process.env.WEBTRAC_PASSWORD;
  // If this is not empty, don't click the continue button at the last step to skip reserving the court for testing
  // purposes
  const isNoReservation = Boolean(process.env.NO_RESERVATION ?? false);
  // Number of days ahead to reserve the court (default is 14 days: 2 weeks)
  const daysAhead = Number(process.env.DAYS_AHEAD ?? 14);
  // Court number to reserve (default is 6)
  const courtNumber = Number(process.env.COURT ?? 6);
  // Maximum number of retries when the warning message appears
  const maxWarningRetries = Number(process.env.MAX_WARNING_RETRIES ?? 200);
  // Interval (milliseconds) to reload the page when the warning message appears
  const reloadInterval = Number(process.env.RELOAD_INTERVAL ?? 500);
  const headless = Boolean(process.env.HEADLESS ?? false);
  const familyMember = process.env.FAMILY_MEMBER;

  console.log("isNoReservation:", isNoReservation);
  console.log("daysAhead:", daysAhead);
  console.log("courtNumber:", courtNumber);
  console.log("maxWarningRetries:", maxWarningRetries);
  console.log("reloadInterval:", reloadInterval);
  console.log("headless:", headless);
  console.log("familyMember:", familyMember);

  if (!username || !password) {
    throw new Error(
      "Error: Username or password not set in environment variables."
    );
  }

  const browser = await chromium.launch({ headless: headless });
  const page = await browser.newPage();

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

    // Calculate reservation date
    const reservationDate = new Date();
    reservationDate.setDate(new Date().getDate() + daysAhead);

    const month = reservationDate.getMonth();
    const day = reservationDate.getDate();
    const year = reservationDate.getFullYear();
    console.log(
      `Reserving court ${courtNumber} on ${month + 1}/${day}/${year}...`
    );

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
    const courtSelector = `table:has(tbody td.label-cell[data-title="Facility Description"]:has-text("Pickleball Court ${courtNumber}")) a:has-text("4:00 pm - 5:00 pm")`;
    await page.waitForSelector(courtSelector);

    // select Pickleball Court, 4:00 PM - 5:00 PM
    await page.click(courtSelector);

    const addToCartSelector = 'text="Add To Cart"';
    await page.waitForSelector(addToCartSelector);
    await page.click(addToCartSelector);

    const warningSelector =
      'text="You have not satisfied any of the following Allowances."';

    const warningSelectorForFamily =
      'text="No family members are able to purchase this item"';

    // Wait until the warning is gone
    let count = 0;

    while (
      ((await page.isVisible(warningSelector)) ||
        (await page.isVisible(warningSelectorForFamily))) &&
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

    // Family Member Selection
    const familyMemberSelection = 'text="Family Member Selection"';
    if (await page.isVisible(familyMemberSelection)) {
      console.log("Family member selection page is shown.");

      if (!familyMember) {
        throw new Error(
          "Family member is required. Please set the FAMILY_MEMBER environment variable."
        );
      }

      await page.click(`div.group:has-text("${familyMember}") button`);
      await page.click('text="Continue"');
      console.log(`${familyMember} is selected.`);
    }

    // Reservation Purpose
    await page.fill('input[id="question10465917"]', "a");
    await page.click('button[id="processingprompts_buttoncontinue"]');

    // Checkout
    await page.click('a[id="webcart_buttoncheckout"]');

    if (isNoReservation) {
      console.log("Reservation is skipped. Clearing cart...");

      // Clear cart
      await page.click('div[id="menu_cart"]');
      await page.click('text="Empty Cart"');
    } else {
      // Continue
      await page.click('a[id="webcheckout_buttoncontinue"]');
      await page.waitForURL("**/confirmation.html*");
      console.log("Reservation confirmed!");
    }
  } catch (error) {
    console.error("Error during reservation:", error);
  } finally {
    await page.screenshot({ path: "screenshot.png" });
    await browser.close();
  }
})();
