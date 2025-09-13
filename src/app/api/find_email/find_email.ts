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

    const emails: string[] = await page.evaluate(() => {
      const found: string[] = [];

      document.querySelectorAll("a[href^='mailto:']").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const addr = href.replace(/^mailto:/i, "").split("?")[0].trim();
        if (addr) found.push(addr);
      });

      const bodyText = document.body?.innerText || "";
      const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const matches = bodyText.match(emailRegex) || [];
      matches.forEach((m) => {
        if (!found.includes(m)) found.push(m);
      });

      return found;
    });

    await browser.close();

    return new Response(
      JSON.stringify({
        email: emails.length > 0 ? emails[0] : null,
        allEmails: emails,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Scraper error:", err);
    if (browser) try { await browser.close(); } catch {}
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}