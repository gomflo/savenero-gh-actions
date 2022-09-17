import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const headers = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "es-ES,es;q=0.9,en;q=0.8,eo;q=0.7,it;q=0.6,gl;q=0.5",
  "cache-control": "max-age=0",
  "sec-ch-ua":
    '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

const PRODUCTS = "products";
import Crawler from "crawler";

async function handler() {
  const { data: products, error } = await supabase
    .from(PRODUCTS)
    .select("*")
    .eq("store_id", 11) // id 11 es Soriana
    .order("crawled_at", { ascending: true, nullsFirst: true })
    .limit(500);

  console.log("products.length", products.length, "error:", error);

  const productsNotFound = [];
  const productsPriceChanged = [];
  const productsUpdateCrawledDate = [];

  let counter = 1;

  const c = new Crawler({
    maxConnections: 100,
    headers,
    callback: function (error, res, done) {
      const $ = res.$;

      const product = res.options;
      const crawledAt = new Date().toLocaleString("sv-SE", {
        timeZone: "America/Monterrey",
      });

      const { statusCode } = res;

      if (statusCode !== 200) {
        productsNotFound.push({
          id: product.id,
          url: product.url,
          has_stock: false,
          crawled_at: crawledAt,
        });
      }

      if ($ && !error && statusCode === 200) {
        const host = res.request.uri.host;

        let price = 0;
        const { current_price: originalPrice, id } = product;

        productsUpdateCrawledDate.push({
          id,
          crawled_at: crawledAt,
        });

        console.log(
          "counter:",
          counter,
          id,
          product.url,
          "products_to_update:",
          productsPriceChanged.length
        );

        const selectors = {
          soriana: {
            // price: $("span.value").attr("content"),
            // price: JSON.parse($($("script[type='application/ld+json']")[0]).text()).offers.price,
            price: $("script[type='application/ld+json']"),
            stock: $("[property='product:availability']").attr("content"),
          },
        };

        switch (host) {
          case "www.soriana.com":
            if (selectors.soriana.price) {
              const priceSel = selectors.soriana.price;

              if (priceSel.length > 0) {
                const priceTxt = $(priceSel[0]).text();
                const priceJson = JSON.parse(priceTxt);

                if (priceJson?.offers?.price) {
                  price = parseFloat(priceJson.offers.price);
                }
              }
            }

            if (originalPrice !== price && price > 0) {
              const priceDiff = originalPrice - price;
              const percentageDiff = priceDiff / originalPrice;

              const hasStock =
                selectors.soriana.stock === "instock" ? true : false;

              productsPriceChanged.push({
                id,
                current_price: price,
                previous_price: originalPrice,
                percentage_dif: percentageDiff,
                has_stock: hasStock,
                updated_at: crawledAt,
              });
            }

            break;
        }

        counter++;
      }
      done();
    },
  });

  c.queue(products);

  c.on("schedule", (options) => {
    options.retries = 0;
  });

  c.on("drain", async () => {
    console.log("Crawler queue is empty.");

    if (productsNotFound.length) {
      console.log("URLs not found:", productsNotFound.length);

      const { data: updatedNotFound, errorNotFound } = await supabase
        .from(PRODUCTS)
        .upsert(productsNotFound);

      if (errorNotFound) {
        console.log(
          "Failed to update products / urls not found:",
          errorNotFound
        );
      }

      if (!errorNotFound && updatedNotFound.length) {
        console.log(
          `Updated crawledAt for ${updatedNotFound.length} products / urls not found.`
        );
      }
    }

    const { data: updatedCrawledDate, error } = await supabase
      .from(PRODUCTS)
      .upsert(productsUpdateCrawledDate);

    if (error) {
      console.log("Failed to update crawl date:", error);
    }

    if (!error && updatedCrawledDate.length)
      console.log(
        `Updated crawledAt for ${updatedCrawledDate.length} records.`
      );

    if (productsPriceChanged.length) {
      const { data: updatedProducesPriceChanged, error: errorPriceChanged } =
        await supabase.from(PRODUCTS).upsert(productsPriceChanged);

      if (errorPriceChanged) {
        console.log("Failed to update price:", errorPriceChanged);
      }

      console.log(
        `Updated ${updatedProducesPriceChanged.length} product prices.`
      );

      if (!errorPriceChanged && updatedProducesPriceChanged.length) {
        let updatedPricingHistoryCounter = 1;

        updatedProducesPriceChanged.map(async (product) => {
          const { data: updatedPricingHistory, error: errorPrcingHistory } =
            await supabase.from("pricing_history").insert({
              product_id: product.id,
              created_at: product.crawled_at,
              price: product.current_price,
            });

          if (errorPrcingHistory) {
            console.log("Failed to update pricing_history:", errorPriceChanged);
          }

          if (!errorPriceChanged) {
            updatedPricingHistoryCounter++;
          }
        });

        console.log(
          `Added ${updatedPricingHistoryCounter} records to pricing_history.`
        );
      }
    }
    handler();
  });
}

handler();
