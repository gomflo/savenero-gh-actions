import { formatISO9075 } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";
const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`;

const headers = {
  "user-agent": ua,
};

const urls = [
  `https://www2.hm.com/es_mx/bebe/recien-nacido/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // bebes · recien nacido
  `https://www2.hm.com/es_mx/bebe/nino/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // bebe · niño
  `https://www2.hm.com/es_mx/bebe/nina/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // bebe · niña
  `https://www2.hm.com/es_mx/oferta/bebe/productos/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // bebe rebajas
  `https://www2.hm.com/es_mx/ninos/nino/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // niño 2-8A
  `https://www2.hm.com/es_mx/ninos/nino-9-14a/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // niño 9-14A
  `https://www2.hm.com/es_mx/ninos/ninas-9-14a/ver-todo/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // niñas 9-14A
  `https://www2.hm.com/es_mx/oferta/ninos/productos/_jcr_content/main/productlisting.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // niñ@s rebajas
  `https://www2.hm.com/es_mx/divided/productos/ver-todo/_jcr_content/main/productlisting_45ad.display.json?sort=stock&image-size=small&image=model&offset=0&page-size=10000`, // divided
  `https://www2.hm.com/es_mx/oferta/divided/ver-todo/_jcr_content/main/productlisting_1f29.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // divided rebajas
  `https://www2.hm.com/es_mx/hombre/productos/ver-todo/_jcr_content/main/productlisting_fa5b.display.json?sort=stock&image-size=small&image=model&offset=0&page-size=10000`, // hombre
  `https://www2.hm.com/es_mx/oferta/hombre/ver-todo/_jcr_content/main/productlisting_9436.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // hombre rebajas
  `https://www2.hm.com/es_mx/mujer/productos/ver-todo/_jcr_content/main/productlisting_30ab.display.json?sort=stock&image-size=small&image=model&offset=0&page-size=10000`, // mujer
  `https://www2.hm.com/es_mx/oferta/mujer/ver-todo/_jcr_content/main/productlisting_b48c.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // mujer rebajas
  `https://www2.hm.com/es_mx/home/productos/ver-todo/_jcr_content/main/productlisting_c559.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // home
  `https://www2.hm.com/es_mx/oferta/home/ver-todo/_jcr_content/main/productlisting_f465.display.json?sort=stock&image-size=small&image=stillLife&offset=0&page-size=10000`, // home rebajas
];

async function handler() {
  for (let link of urls) {
    const request = await fetch(link, { headers });
    const response = await request.json();

    const products = [];
    response.products?.map((product) => {
      const title = product.title;
      const price = get_price(product);
      const url = get_url(product);
      const image = get_image(product);
      const now = formatISO9075(new Date());
      const storeId = 22;

      products.push({
        title: title,
        current_price: price,
        url: url,
        image_url: image,
        store_id: storeId,
        crawled_at: now,
      });
    });

    // console.log(products);

    const { data, error } = await supabase
      .from(PRODUCTS)
      .upsert(products, { onConflict: "url" });

    products.map((product) => console.log(product.title, product.url));

    if (error) {
      console.log("error:", error);
    }
    if (!error) {
      console.log(`updated ${data.length} products.`);
    }
  }
}

handler();

function get_price(product) {
  const price = product.redPrice ? product.redPrice : product.price;
  return parseFloat(price.replace("$", "").replace(",", ""));
}

function get_url(product) {
  return `https://www2.hm.com${product.link}`;
}

function get_image(product) {
  return `https:${product.image
    .pop()
    .src.replace("file:/product/style", "file:/product/fullscreen")}`;
}
