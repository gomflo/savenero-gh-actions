import fetch from "node-fetch";

async function handler() {
  const request = await fetch(
    "https://seapi.sears.com.mx/anteater/search?cliente=sears_v2&proxystylesheet=xml2json&oe=UTF-8&getfields=*&sort=&start=0&num=100&requiredobjects=categories-%3Eid:16731&ds=marcas:attribute_marca:0:0:100:0:1.sale_precio:sale_price:1:1:1000.ranking:review:0:0:8:0:1.full:fulfillment:0:0:8:0:1.free:shipping_price:0:0:8:0:1.discount:discount:0:0:1000:0:1&do=breadcrumbs:breadcrumbs:id,name,padre:100:1",
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "es-ES,es;q=0.9,en;q=0.8,eo;q=0.7,it;q=0.6,gl;q=0.5",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );
  const response = await request.text();

  console.log(request);
}

handler();
