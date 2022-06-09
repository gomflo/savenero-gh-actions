import fetch from "node-fetch";

async function handle() {
  const url = `https://www.costco.com.mx/Sports-Leisure/Cycling/Mountain-Bikes/p/662700`;
  const request = await fetch(url);
  const res = await request;
  console.log(res);
}

handle();
