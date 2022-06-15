import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const headers = {
  cookie: `session-id=133-2419022-6735569; lc-acbmx=es_MX; ubid-acbmx=131-2112019-9374156; sid="HMZZ/NSD7qF3BIFSQEFVAw==|Scm2wBN/BczFk4/PMdGvpOaPRmTXwxA3lIiWy5uHoAE="; x-acbmx="FfN93DoisXSrQM7Aj@Aeg4P2G7c4D5xc"; at-acbmx=Atza|IwEBIIbQurysmV9jclbeexhNFTDVNte8UJV6SnYGFQAdrpQqz4UsG-XZ2Fu2UPEEuKzwKvqfojS_5ltlEKqKpA_NgQ0tdpmhpRJjrrJdHmgLueO-40EeTEoWh-W2sRS-nQcMbvmngG8lQfQcM-GBF-8s0P2Rt_1yFm71YY7rUokv8qQWortUvKgsO9XvbDgyuFPQjuEGXtRH0V_Z4rUiDwijsysBLMzvMHA7MaiT2kOyx9GgfQ; sess-at-acbmx="dZun1WqCoTfFLKWmOX7yl1N7lEJMIzG7cEfg9/5KfkQ="; sst-acbmx=Sst1|PQEOirItXE76mq0X6AUF_BRRCY3gdQLXQ9q1V9_Olci-_zvPVg9wT5zhNDf9KZb9Z1D-U3yGNc08vmCbVeIJJNFUxUltwcjmAkuCix0Wolew6x-gacdhfl5eLeGAZxBjdTUwKZMvsSgk5ejpyfPKv2M_PBeXcE7WNXvqKDxNs-gliDdFzeCCbtjXhs5GUwXxOWSEBagCwUMCLeJ5leBgImT7FzGrDgucOJr-erx6vrQ8I19pS-3t7N_JUfU1_QQ8H8PdQeVc57ncMIDZeNvE-Rele-GOtMx-6zdUTvGSiNpogfQ; i18n-prefs=MXN; _msuuid_jniwozxj70=3AFAEB2F-2E80-4249-A114-2C2142B71EE7; session-token=bVA7YIAYnw38UH4GtErbN9nzvYd4mJCCVJLtXzeHX4bXLQZSeR8Q7kqOKRhtB+kNBG8rBUNPYOUWNRCKtKuAhV5O4ttakMhxJUQaLJePCwYoWaXb4TZHf3ihTgVwiJttvPhmt3a/7eqdbaJagz02vbcCZZ9UVj7H1I00wif4cm7IGgioowbm9LX60ie9eD/yRWsqBW1NuzSq2W1BqvOYYxhar26LOThy; session-id-time=2082787201l; csm-hit=tb:PD20S0DEASDAD94H995M+s-PD20S0DEASDAD94H995M|1653520142727&t:1653520142727&adb:adblk_no`,
  "user-agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36`,
};

const PRODUCTS = "products";
import Crawler from "crawler";

async function handler() {
  const { data: products, error } = await supabase
    .from(PRODUCTS)
    .select("*")
    .eq("store_id", 8) // id 8 es amazon Store
    .order("crawled_at", { ascending: true, nullsFirst: true })
    .limit(500);

  console.log("products.length", products.length, "error:", error);

  const productsNotFound = [];
  const productsPriceChanged = [];
  const productsUpdateCrawledDate = [];

  let counter = 1;

  const c = new Crawler({
    maxConnections: 1,
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
          price: $("#twister-plus-price-data-price").val(),
          stock: true,
        };

        if (selectors.price) {
          price = parseFloat(selectors.price);
        }

        if (originalPrice !== price && price > 0) {
          const priceDiff = originalPrice - price;
          const percentageDiff = priceDiff / originalPrice;

          const hasStock = true;

          productsPriceChanged.push({
            id,
            current_price: price,
            previous_price: originalPrice,
            percentage_dif: percentageDiff,
            has_stock: hasStock,
            updated_at: crawledAt,
          });
        }

        counter++;
      }
      done();
    },
  });

  c.queue(products);

  c.on("schedule", (options) => {
    // options.retries = 0;
    // options.proxy = "http://yplztlcc-rotate:mva3plful3mf@p.webshare.io:80";
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
