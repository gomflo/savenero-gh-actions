import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";

async function handler() {
  const { data: products, error } = await supabase
    .from(PRODUCTS)
    .select("*")
    .eq("store_id", 1) // id 1 es Costco
    .order("crawled_at", { ascending: true, nullsFirst: true })
    .limit(1);

  console.log("products.length", products.length, "error:", error);

  const productsNotFound = [];
  const productsPriceChanged = [];
  const productsUpdateCrawledDate = [];

  let counter = 1;

  for await (let product of products) {
    const url = product.url;
    const productID = url.split("/").pop();

    const apiUrl = `http://www.costco.com.mx/rest/v2/mexico/products/${productID}/?fields=FULL&lang=es_MX&curr=MXN`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    const price = json?.price?.value;

    const crawledAt = new Date().toLocaleString("sv-SE", {
      timeZone: "America/Monterrey",
    });

    if (!price) {
      productsNotFound.push({
        id: product.id,
        url: product.url,
        has_stock: true,
        crawled_at: crawledAt,
      });
    }

    if (price) {
      productsUpdateCrawledDate.push({
        id: product.id,
        crawled_at: crawledAt,
      });

      console.log(
        "counter:",
        counter,
        product.id,
        product.url,
        "products_to_update:",
        productsPriceChanged.length
      );

      if (product.current_price !== price && price > 0) {
        const priceDiff = product.current_price - price;
        const percentageDiff = priceDiff / product.current_price;

        const { data: updatedProducesPriceChanged, error: errorPriceChanged } =
          await supabase.from(PRODUCTS).upsert([
            {
              id: product.id,
              current_price: price,
              previous_price: product.current_price,
              percentage_dif: percentageDiff,
              has_stock: true,
              updated_at: crawledAt,
            },
          ]);

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
              console.log(
                "Failed to update pricing_history:",
                errorPriceChanged
              );
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

      counter++;
    }

    // await new Promise((r) => setTimeout(r, 500));
  }

  if (productsNotFound.length) {
    console.log("URLs not found:", productsNotFound.length);

    const { data: updatedNotFound, errorNotFound } = await supabase
      .from(PRODUCTS)
      .upsert(productsNotFound);

    if (errorNotFound) {
      console.log("Failed to update products / urls not found:", errorNotFound);
    }

    if (!errorNotFound && updatedNotFound.length) {
      console.log(
        `Updated crawledAt for ${updatedNotFound.length} products / urls not found.`
      );
    }
  }

  const { data: updatedCrawledDate, error: errorCrawledDate } = await supabase
    .from(PRODUCTS)
    .upsert(productsUpdateCrawledDate);

  if (errorCrawledDate) {
    console.log("Failed to update crawl date:", errorCrawledDate);
  }

  if (!errorCrawledDate && updatedCrawledDate.length)
    console.log(`Updated crawledAt for ${updatedCrawledDate.length} records.`);

  handler();
}

handler();
