import { createClient } from "@supabase/supabase-js";
import { formatISO9075 } from "date-fns";
import fetch from "node-fetch";
import xml2js from "xml2js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCTS = "products";
const domain = "https://www.costco.com.mx";
const storeId = 1;

async function getCategories() {
  const xmlUrl = "https://www.costco.com.mx/sitemap_mexico_category.xml";

  const request = await fetch(xmlUrl);
  const xml = await request.text();

  const parser = new xml2js.Parser();
  const doc = await parser.parseStringPromise(xml);
  const urlset = doc.urlset.url;

  const categories = [];
  categories.push("cos_1.5.6"); // macbooks & imacs category that does not exists in the xml file.

  for (let url of urlset) {
    const category = url.loc[0].split("/").pop();
    categories.push(category);
  }

  return categories;
}

async function crawl(category, page = 0) {
  const productListUrl = buildUrl({
    pageSize: 100,
    page: page,
    category: category,
  });

  const request = await fetch(productListUrl);
  const response = await request.json();

  console.log("url:", productListUrl);

  console.log(
    "currentPage",
    response.pagination?.currentPage ?? null,
    "totalPages:",
    response.pagination?.totalPages ?? null,
    "results:",
    response.pagination?.totalResults ?? null
  );

  const products = response.products
    ?.map((product) => {
      const image = product.images?.filter(
        (image) => image.format === "product"
      )[0];

      const now = formatISO9075(new Date());

      const result = {
        title: product.name,
        current_price: product.price?.value ?? null,
        url: domain + product.url,
        image_url: image?.url ? domain + image.url : null,
        sku: product.code,
        store_id: storeId,
        crawled_at: now,
      };

      return result;
    })
    .filter((product) => product.current_price);

  const { data, error } = await supabase
    .from(PRODUCTS)
    .upsert(products, { onConflict: "url" });

  // console.log(data, products.length);

  if (error) console.log("error:", error);
  if (!error) console.log(`updated ${data.length} products.`);

  const totalPages = response.pagination?.totalPages
    ? response.pagination.totalPages - 1
    : 0;

  const currentPage = response.pagination?.currentPage ?? 0;

  if (currentPage < totalPages) {
    await crawl(category, currentPage + 1);
  }
}

async function handler() {
  const categories = await getCategories();
  // const categories = ["cos_9.2.1"];

  for (let category of categories) {
    await crawl(category);
  }

  handler(); // > run 4 ever
}

handler();

function buildUrl(options) {
  return `${domain}/rest/v2/mexico/products/search?fields=FULL&query=&pageSize=${options.pageSize}&category=${options.category}&lang=es_MX&curr=MXN&currentPage=${options.page}`;
}
