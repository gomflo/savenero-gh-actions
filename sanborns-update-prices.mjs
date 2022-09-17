import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { formatISO9075 } from "date-fns";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";
const storeId = 12;

async function handler() {
  // const categories = [4, 2, 10, 1, 16, 7, 12, 14, 13, 6];
  const categories = [10, 12, 2, 13, 4, 14, 6, 1, 16, 7];

  for (let category of categories) {
    const totalProducts = await getTotalProducts(category);

    const products = [];
    for (let i = 0; i <= totalProducts; i++) {
      const request = await fetch(buildUrl({ category, start: i }));
      const response = await request.json();
      const results = response.GSP.RES.R;

      results.length &&
        results.map((result) => {
          const price = parseFloat(result.MT[5].V);
          const url = getProductUrl({
            id: result.MT[0].V,
            slug: result.MT[36].V,
          });
          const imageUrl = result.MT[42].V;
          const now = formatISO9075(new Date());

          if (!products.some((el) => el.url === url)) {
            products.push({
              title: result.T,
              current_price: price,
              url: url,
              image_url: imageUrl,
              description: result.S,
              store_id: storeId,
              crawled_at: now,
            });
          }
        });

      i = i + 199;
    }

    const { data, error } = await supabase
      .from(PRODUCTS)
      .upsert(products, { onConflict: "url" });

    // console.log(data, products.length);

    if (error) console.log("error:", error);
    if (!error) console.log(`updated ${data.length} products.`);
  }
}

handler();

function getProductUrl({ id, slug }) {
  return `https://www.sanborns.com.mx/producto/${id}/${slug}/`;
}

async function getTotalProducts(category) {
  const req = await fetch(buildUrl({ category }));
  const res = await req.json();
  const totalProducts = res.GSP.RES.M;
  return totalProducts;
}

function buildUrl({ num = 200, start = 0, category }) {
  const apiUrl = `https://snapi.sanborns.com.mx/anteater/search?cliente=sanborns_2&proxystylesheet=xml2json&oe=UTF-8&getfields=*&sort=&start=${start}&num=${num}&requiredfields=&requiredobjects=categories-%3Eid:${category}&ds=marcas:attribute_marca:0:0:8:0:1.sale_precio:sale_price:1:1:1000.ranking:review:0:0:8:0:1.full:fulfillment:0:0:8:0:1.free:shipping_price:0:0:8:0:1.discount:discount:0:0:1000:0:1&do=breadcrumbs:breadcrumbs:id,name,padre:${category}:1`;
  return apiUrl;
}
