import { createClient } from "@supabase/supabase-js";
import { formatISO9075 } from "date-fns";
import fetch from "node-fetch";
import xml2js from "xml2js";

import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// const PRODUCTS = "products";
// const domain = "https://www.costco.com.mx";
// const storeId = 1;

async function getCategories() {
  const xmlUrl = "https://www.costco.com.mx/sitemap_mexico_category.xml";

  const request = await fetch(xmlUrl);
  const xml = await request.text();

  const parser = new xml2js.Parser();
  const doc = await parser.parseStringPromise(xml);
  const urlset = doc.urlset.url;

  const categories = [];
  categories.push("cos_1.5.6"); // macbooks & imacs category that does not exists in the xml file.
  categories.push("cos_5.1.1"); // colchones category that does not exits in the xml file.

  for (let url of urlset) {
    const category = url.loc[0].split("/").pop();
    categories.push(category);
  }

  return categories;
}
