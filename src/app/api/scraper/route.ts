import puppeteer, { Browser } from "puppeteer";

export async function POST(req: Request) {
  let browser: Browser | null = null;

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400 });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const scraped = await page.evaluate(() => {
      const result: {
        emails: string[];
        phones: string[];
        location: string | null;
      } = {
        emails: [],
        phones: [],
        location: null,
      };

      // ----- EXTRACT EMAILS -----
      document.querySelectorAll("a[href^='mailto:']").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const addr = href.replace(/^mailto:/i, "").split("?")[0].trim();
        if (addr && !result.emails.includes(addr)) result.emails.push(addr);
      });

      const bodyText = document.body?.innerText || "";
      const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      (bodyText.match(emailRegex) || []).forEach((m) => {
        if (!result.emails.includes(m)) result.emails.push(m);
      });

      // ----- EXTRACT PHONE NUMBERS -----
      const phoneRegex =
        /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
      (bodyText.match(phoneRegex) || []).forEach((p) => {
        if (!result.phones.includes(p)) result.phones.push(p);
      });

      // ----- EXTRACT LOCATION -----
      const addressEl = document.querySelector("address");
      if (addressEl) {
        result.location = addressEl.textContent?.trim() || null;
      } else {
        // fallback: look for city/state/ZIP pattern in text
        const locationRegex = /\b[A-Z][a-z]+(?:,)?\s+(?:[A-Z][a-z]+)\s+\d{5}(?:-\d{4})?\b/;
        const bodyText = document.body?.innerText || "";
        const locMatch = bodyText.match(locationRegex);
        if (locMatch) {
          result.location = locMatch[0].trim();
        }
      }


      return result;
    });

    await browser.close();

    return new Response(
      JSON.stringify({
        email: scraped.emails[0] || null,
        allEmails: scraped.emails,
        phone: scraped.phones[0] || null,
        allPhones: scraped.phones,
        location: scraped.location,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Scraper error:", err);
    if (browser) try { await browser.close(); } catch {}
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}


// // route.ts
// import puppeteer from "puppeteer";

// export async function POST(req: Request) {
//   try {
//     const { url } = await req.json();

//     if (!url) {
//       return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400 });
//     }

//     const browser = await puppeteer.launch({
//       headless: true,
//       args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
//     });

//     const page = await browser.newPage();

//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
//     );

//     await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

//     await page.waitForFunction(() => {
//       const el = document.querySelector("h1");
//       return el?.textContent?.trim().length > 0;
//     }, { timeout: 60000 });

//     const nameEl = await page.$("h1");
//     const name = nameEl ? await page.evaluate(el => el.textContent?.trim(), nameEl) : null;

//     const specialtyEl = await page.$("h2");
//     const specialty = specialtyEl ? await page.evaluate(el => el.textContent?.trim(), specialtyEl) : null;

//     const locationEl = await page.$("a[href*='/find-location/facility/']");
//     const location = locationEl ? await page.evaluate(el => el.textContent?.trim(), locationEl) : null;

//     const phoneEl = await page.$("a[href^='tel:']");
//     const phone = phoneEl ? await page.evaluate(el => el.textContent?.trim(), phoneEl) : null;


//     await browser.close();

//     return new Response(JSON.stringify({ name, specialty, location, phone }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (err: any) {
//     console.error("Scraper error:", err);
//     return new Response(JSON.stringify({ error: err.message }), { status: 500 });
//   }
// }