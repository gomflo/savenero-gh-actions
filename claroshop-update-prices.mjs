import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { formatISO9075 } from "date-fns";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";
const storeId = 21;

async function handler() {
  const categories = [
    21838, 21951, 21988, 22097, 21825, 21826, 21827, 21828, 21829, 21844, 21830,
    21831, 21832, 21833, 21834, 21835,
  ];

  for (let category of categories) {
    const totalProducts = await getTotalProducts(category);

    for (let i = 0; i <= totalProducts; i++) {
      const products = [];

      const requestUrl = buildUrl({ category, start: i });
      console.log(requestUrl);

      const request = await fetch(requestUrl);
      console.log(request);

      if (request.status !== 200) continue;

      const response = await request.json();
      const results = response.GSP.RES.R;

      results.map((result) => {
        const id = result.MT.filter((r) => r.N === "id").pop().V;
        const slug = result.MT.filter((r) => r.N === "title_seo").pop().V;
        const url = getProductUrl({ id, slug });

        const price = parseFloat(
          result.MT.filter((r) => r.N === "sale_price").pop().V
        );

        const imageUrl = result.MT.filter((r) => r.N === "link").pop().V;
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
  return `https://www.claroshop.com/producto/${id}/${slug}/`;
}

async function getTotalProducts(category) {
  const req = await fetch(buildUrl({ category }));
  const res = await req.json();
  const totalProducts = res.GSP.RES.M;
  return totalProducts;
}

function buildUrl({ num = 200, start = 0, category }) {
  const apiUrl = `https://www.claroshop.com/anteater/search?cliente=claro&proxystylesheet=xml2json&oe=UTF-8&getfields=*&sort=&start=${start}&num=${num}&requiredfields=&requiredobjects=categories->id:${category}&ds=marcas:attribute_marca:0:0:8:0:1.sale_precio:sale_price:1:1:1000.ranking:review:0:0:8:0:1.full:fulfillment:0:0:8:0:1.free:shipping_price:0:0:8:0:1.discount:discount:0:0:1000:0:1&do=breadcrumbs:breadcrumbs:id,name,padre:${category}:1`;
  return apiUrl;
}
