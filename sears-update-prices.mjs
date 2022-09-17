import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { formatISO9075 } from "date-fns";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";
const storeId = 20;

async function handler() {
  const categories = [
    16871, 16872, 4550, 16649, 4497, 4511, 4496, 4503, 4499, 5916, 17111, 4502,
    17154, 17192, 17280, 5914,
  ];
  // const categories = [4498];

  for (let category of categories) {
    const totalProducts = await getTotalProducts(category);

    for (let i = 0; i <= totalProducts; i++) {
      const products = [];

      const request = await fetch(buildUrl({ category, start: i }));
      if (request.status !== 200) continue;

      const response = await request.json();
      const results = response.GSP.RES.R;

      results.map((result) => {
        const url = getProductUrl({
          id: result.MT[0].V,
          slug: result.MT[36].V,
        });

        const price = parseFloat(result.MT[5].V);
        const imageUrl = result.MT[42] ? result.MT[42].V : null;
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

      // console.log(products);

      const { data, error } = await supabase
        .from(PRODUCTS)
        .upsert(products, { onConflict: "url" });

      products.map((product) =>
        console.log(product.title, category, product.url)
      );

      // console.log(data, products.length);

      if (error) {
        console.log("error:", error);
      }
      if (!error) {
        console.log(
          `updated ${data.length} products … ${i} of ${totalProducts}.`
        );
      }

      i = i + 199;
    }
  }
}

handler();

function getProductUrl({ id, slug }) {
  return `https://www.sears.com.mx/producto/${id}/${slug}/`;
}

async function getTotalProducts(category) {
  const req = await fetch(buildUrl({ category }));
  const res = await req.json();
  const totalProducts = res.GSP.RES.M;
  return totalProducts;
}

function buildUrl({ num = 200, start = 0, category }) {
  const apiUrl = `https://seapi.sears.com.mx/anteater/search?cliente=sears_v2&proxystylesheet=xml2json&oe=UTF-8&getfields=*&sort=&start=${start}&num=${num}&requiredfields=&requiredobjects=categories-%3Eid:${category}&ds=marcas:attribute_marca:0:0:100:0:1.sale_precio:sale_price:1:1:1000.ranking:review:0:0:8:0:1.full:fulfillment:0:0:8:0:1.free:shipping_price:0:0:8:0:1.discount:discount:0:0:1000:0:1&do=breadcrumbs:breadcrumbs:id,name,padre:100:1`;
  return apiUrl;
}
