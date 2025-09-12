// route.ts
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForFunction(() => {
      const el = document.querySelector("h1");
      return el?.textContent?.trim().length > 0;
    }, { timeout: 60000 });

    const nameEl = await page.$("h1");
    const name = nameEl ? await page.evaluate(el => el.textContent?.trim(), nameEl) : null;

    const specialtyEl = await page.$("h2");
    const specialty = specialtyEl ? await page.evaluate(el => el.textContent?.trim(), specialtyEl) : null;

    const locationEl = await page.$("a[href*='/find-location/facility/']");
    const location = locationEl ? await page.evaluate(el => el.textContent?.trim(), locationEl) : null;

    const phoneEl = await page.$("a[href^='tel:']");
    const phone = phoneEl ? await page.evaluate(el => el.textContent?.trim(), phoneEl) : null;


    await browser.close();

    return new Response(JSON.stringify({ name, specialty, location, phone }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Scraper error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}