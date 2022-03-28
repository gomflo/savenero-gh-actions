import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// comment to push
const PRODUCTS = "products";
import Crawler from "crawler";

async function handler() {
  const { data: products, error } = await supabase
    .from(PRODUCTS)
    .select("*")
    .like("url", "%www.elektra.com.mx%")
    .order("crawled_at", { ascending: true, nullsFirst: true })
    .limit(5000);

  console.log("products.length", products.length, "error:", error);

  const productsNotFound = [];
  const productsPriceChanged = [];
  const productsUpdateCrawledDate = [];

  let counter = 1;

  const c = new Crawler({
    maxConnections: 100,
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
    },
    callback: function (error, res, done) {
      const $ = res.$;

      const product = res.options;
      const crawledAt = new Date().toLocaleString("sv-SE", {
        timeZone: "America/Monterrey",
      });

      if (res.statusCode === 404 || res.statusCode === 410) {
        productsNotFound.push({
          id: product.id,
          url: product.url,
          has_stock: false,
          crawled_at: crawledAt,
        });
      }

      if ($ && !error) {
        const selectors = {
          elektra: {
            price: $("meta[property='product:price:amount']").attr("content"),
            stock: $("[property='product:availability']").attr("content"),
          },
        };

        if (res.statusCode === 200) {
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

          switch (host) {
            case "www.elektra.com.mx":
              if (selectors.elektra.price) {
                price = parseFloat(selectors.elektra.price);
              }

              if (originalPrice !== price && price > 0) {
                const priceDiff = originalPrice - price;
                const percentageDiff = priceDiff / originalPrice;

                const hasStock =
                  selectors.elektra.stock === "instock" ? true : false;

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
  });
}

handler();
