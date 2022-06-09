import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { formatISO9075 } from "date-fns";
import cheerio from "cheerio";

const supabaseUrl = "https://djrbcopbtieqgdkowvhs.supabase.co";
const supabaseKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcmJjb3BidGllcWdka293dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDc5ODA5NTAsImV4cCI6MTk2MzU1Njk1MH0.3Psi3YQPrDsChUsGh6S8FCgiCbnkeoDsL5L-gS3kki0`;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";

const domain = "https://www.amazon.com.mx";
const storeId = 8;

const headers = {
  cookie: `csm-hit=tb:92YEGMNF9JY8QQS56N0C+s-3MY73YNJZ4WW2MXCT6Q7|1654785172357&t:1654785172357&adb:adblk_no; session-id=131-1454305-9099555; session-id-time=2082787201l; session-token=W9Kq06kCjcmaVysbaXkK9rtUTdMMbTBfPlvNWYhOqkNfbDSvnUTEfOvsklCudgeWCIsvSP8NIcIaaC4GO3B+3NlBpTxGumnmSZl0CdJJIa3NFUt7tpfgN/dCN2+X/IfrKh1p1AaoC57wH0gAGfqOuYua+AnA7SSIHNWwQRkyZsEu2nPDGZS4a0jcKumMxbuhdOW1koIRx/hVwwtQnXh2XQeWY6gv6GQZ; i18n-prefs=MXN; lc-acbmx=es_MX; ubid-acbmx=132-7416728-8769622; x-acbmx="Ol4GXh?vERzKE1kRXa@ZwX8So?65LkrD97YqdiJLwrwxxERqZT@VcxC@5uUf@IPa"; at-acbmx=Atza|IwEBICDoY9KPnhdgu6x6P4_WQnGJgFkCWt98gawaSOlPgYN-6knC7oIkstTCrNFXPmKtYqFCs5zq0YRXbyAqnK7HgmGBnEJDaUcM-OsPfNSdQTn9DXbV-3sukfNYu69GjaMFEhOmciFZjuVjCKNCfnybVDb5gsPV6ZbsFim_lZl3n_nloZ2XvUSnWPnebiB7W0MWsmRZDmHcanXlWc4-qXbrjqJ7; sess-at-acbmx="9icX/2QxXpoQWXY2p2PaE5rSdhNtjRY/RcezKDK4IcI="; sst-acbmx=Sst1|PQEVtnzVNCTd8XdRkuMY5yH9DBu9Yav55fEaVohodzieFZ217ZnUwGZcahOclzLw8Ff6TkfaqG3bPt64SkFfGWitvevREeSP1NuC6oRZ5BU1EhzEceUuWc4uobMGCjOtKudT38jce55tJ2X8wmim9XXj5NNxlOqPFIs_fRtKquHJLAnwprHeyfnEbkMZ_xzXBF9Rm64DcMi5HZgUtrtWm4ZJSlW0llq3TyZu_Id0u8bQLbxYn2vA5tWNZrYQUrbZWxHgX0pvolV1k-OS8VPZzSR-2ObUtCfi3va0BrC0I_fuRvrdobwTQCbEQ-jQ2Y9Ze5LprOKVr2NCDLhqVU_gAVe1HVkwDM41TRCGrtUySxANaAY; x-amz-captcha-1=1653499048627290; x-amz-captcha-2=QXQIFPK/KN1IG8976HBxKQ==`,
  accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9`,
};

const categoriesUrl = [
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9482558011&fs=true&qid=1654573141&ref=sr_pg_2", //> todos electronicos
  "https://www.amazon.com.mx/s?i=grocery&rh=n%3A17724630011&fs=true&qid=1654571185&ref=sr_pg_2", //> vinos y licores
  "https://www.amazon.com.mx/s?i=hi&rh=n%3A9482670011&fs=true&qid=1654632162&ref=sr_pg_2", //> todo herramientas mejoras del hogar
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687280011&fs=true&qid=1654608099&ref=sr_pg_2", //> accesorios electronicos
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687422011&fs=true&qid=1654744900&ref=sr_pg_2", //> celulares y accesorios
  "https://www.amazon.com.mx/s?i=pets&rh=n%3A11782336011&fs=true&page=2&qid=1654657791&ref=sr_pg_2", //> todo en mascotas
  "https://www.amazon.com.mx/s?i=toys&rh=n%3A11260442011&fs=true&qid=1654628503&ref=sr_pg_2", //> todo en juegos y juguetes
  "https://www.amazon.com.mx/s?i=kitchen&rh=n%3A9482593011&fs=true&qid=1654626035&ref=sr_pg_2", //> todo en hogar y cocina
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687880011&fs=true&qid=1654621330&ref=sr_pg_2", //> todo en computo y tablets
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687308011&fs=true&qid=1654615881&ref=sr_pg_2", //> audifonos
  "https://www.amazon.com.mx/s?i=toys&rh=n%3A11337429011&fs=true&qid=1654610467&ref=sr_pg_2", //> figuras de accion
  "https://www.amazon.com.mx/s?i=videogames&rh=n%3A9482640011&fs=true&qid=1654618308&ref=sr_pg_2", //> todo en videojuegos
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A10189676011&fs=true&qid=1654573659&ref=sr_pg_2", //> tablets
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687604011&fs=true&qid=1654573429&ref=sr_pg_2", //> tocadiscos
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687469011&fs=true&qid=1654573752&ref=sr_pg_2", //> smartwatch
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A9687578011&fs=true&qid=1654573493&ref=sr_pg_2", //> streaming devices
  "https://www.amazon.com.mx/s?i=electronics&rh=n%3A10189669011&fs=true&qid=1654571232&ref=sr_pg_2", //> laptops
  "https://www.amazon.com.mx/s?i=fashion&rh=n%3A14093001011&fs=true&qid=1654655223&ref=sr_pg_2", //> todo en bolas maletas viajes
  "https://www.amazon.com.mx/s?i=automotive&rh=n%3A13848848011&fs=true&qid=1654634508&ref=sr_pg_2", //> todo auto y moto
];

async function crawl(page = 1, catUrl) {
  const url = `${catUrl}&page=${page}`;
  const request = await fetch(url, { headers });

  console.log(request.status);
  if (request.status === 503) {
    await sleep(10000);
    await crawl(page, catUrl);
  }

  const html = await request.text();

  const $ = cheerio.load(html);

  const productsList = getProductsList($);
  const products = [];
  productsList.map((idx, product) => {
    const href = getHref(product, $);

    const title = getTitle(product, $);
    const image = getImage(product, $);
    const priceStr = getPrice(product, $);

    if (priceStr && title) {
      const price = stripPrice(priceStr);
      const url = getUrl(href, domain);
      const asin = getAsinFromUrl(url);
      const now = formatISO9075(new Date());

      const result = {
        title: title,
        current_price: price,
        url: url,
        image_url: image,
        sku: asin,
        store_id: storeId,
        crawled_at: now,
      };

      products.push(result);
    }
  });

  const { data, error } = await supabase
    .from(PRODUCTS)
    .upsert(products, { onConflict: "url" });

  if (error) console.log("error:", error);
  if (!error) {
    // console.log(data);
    console.log(`page ${page} · updated ${data.length} products · ${url}`);
  }

  const nextUrl = getNextUrl($);
  if (nextUrl) {
    const nextPage = new URLSearchParams(nextUrl).get("page");

    await sleep(10000);
    await crawl(nextPage, catUrl);
  }
}

async function handle() {
  for (let catUrl of categoriesUrl) {
    await crawl(1, catUrl);
  }
}

handle();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextUrl($) {
  return $(
    ".s-pagination-item.s-pagination-next.s-pagination-button.s-pagination-separator"
  ).attr("href");
}

function getAsinFromUrl(url) {
  return url.split("/").pop();
}

function getUrl(href, domain) {
  return domain + href.split("?")[0].split("/ref")[0];
}

function stripPrice(priceStr) {
  return parseFloat(priceStr.replace("$", "").replace(",", ""));
}

function getPrice(el, $) {
  return $(el).find("[data-a-size='l'] .a-offscreen").text();
}

function getImage(el, $) {
  return (
    $(el)
      .find("[data-component-type='s-product-image'] .s-image")
      .attr("srcset")
      .split(",")
      .pop()
      .trim()
      .split(" ")[0] ?? null
  );
}

function getTitle(el, $) {
  const title = $(el)
    .find(".a-link-normal span.a-size-base-plus.a-color-base.a-text-normal")
    .text()
    ? $(el)
        .find(".a-link-normal span.a-size-base-plus.a-color-base.a-text-normal")
        .text()
    : $(el)
        .find(".a-link-normal span.a-size-medium.a-color-base.a-text-normal")
        .text();

  return title;
}

function getHref(el, $) {
  return $(el)
    .find("[data-component-type='s-product-image'] .a-link-normal")
    .attr("href");
}

function getProductsList($) {
  const products = $(
    ".s-search-results [data-component-type='s-search-result']"
  );

  return products.map((idx, product) => {
    const href = getHref(product, $);

    if (href.includes("/dp/")) {
      return product;
    }
  });
}
