import puppeteer, { Browser } from "puppeteer";

export async function POST(req: Request) {
  let browser: Browser | null = null;

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response("error: No URL provided", { status: 400 });
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
        name: string | null;
        specialty: string | null;
      } = {
        emails: [],
        phones: [],
        location: null,
        name: null,
        specialty: null,
      };

      const bodyText = document.body?.innerText || "";

      // ----- EXTRACT EMAILS -----
      document.querySelectorAll("a[href^='mailto:']").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const addr = href.replace(/^mailto:/i, "").split("?")[0].trim();
        if (addr && !result.emails.includes(addr)) result.emails.push(addr);
      });

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
        const addrText = addressEl.textContent?.trim() || "";
        const cityStateRegex = /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*),\s*([A-Z]{2}|UK)\b/;
        const locMatch = addrText.match(cityStateRegex);
        if (locMatch) {
          result.location = `${locMatch[1]}, ${locMatch[2]}`;
        }
      } else {
        const cityStateRegex = /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*),\s*([A-Z]{2}|UK)\b/;
        const locMatch = bodyText.match(cityStateRegex);
        if (locMatch) {
          result.location = `${locMatch[1]}, ${locMatch[2]}`;
        }
      }

      // ----- EXTRACT NAME -----
      const h1El = document.querySelector("h1");
      if (h1El) {
        result.name = h1El.textContent?.trim() || null;
      }

      if (!result.name) {
        const ogSiteName = document.querySelector("meta[property='og:site_name']");
        if (ogSiteName) {
          result.name = ogSiteName.getAttribute("content")?.trim() || null;
        }
      }

      if (!result.name) {
        result.name = document.title?.trim() || null;
      }

      // ----- EXTRACT SPECIALTY (only for people) -----
      if (result.name) {
        const isPerson = /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(result.name);
        if (isPerson) {
          // look for h2 under name
          const h2El = document.querySelector("h2");
          if (h2El) {
            result.specialty = h2El.textContent?.trim() || null;
          }

          // fallback: meta description
          if (!result.specialty) {
            const metaDesc = document.querySelector("meta[name='description']");
            if (metaDesc) {
              const content = metaDesc.getAttribute("content") || "";
              if (content.length < 200) result.specialty = content.trim();
            }
          }

          // fallback: extract common keywords from body
          if (!result.specialty) {
            const specialtyRegex = /\b(?:Coach|Therapist|Psychiatrist|Doctor|MD|PhD|Counselor|Hypnotherapist)\b/i;
            const match = bodyText.match(specialtyRegex);
            if (match) result.specialty = match[0];
          }
        }
      }

      return result;
    });

    await browser.close();

    // Fallback: domain name if no name
    let name = scraped.name || "";
    if (!name) {
      try {
        const hostname = new URL(url).hostname.replace("www.", "");
        name = hostname.split(".")[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      } catch {}
    }

    // Build TSV row (Website, Email, Name, Location, Specialty, Phone Number)
    const row = [
      url, // Website
      scraped.emails[0] || "", // Email
      name, // Name
      scraped.location || "", // Location
      scraped.specialty || "", // Specialty
      scraped.phones[0] || "", // Phone Number
    ];

    const tsv = row.join("\t");

    return new Response(tsv, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err: any) {
    console.error("Scraper error:", err);
    if (browser) try { await browser.close(); } catch {}
    return new Response(`error: ${err.message}`, { status: 500 });
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