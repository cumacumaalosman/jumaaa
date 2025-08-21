export const config = {
  runtime: "edge",
};

const TARGET_HOST = "https://ecsc-expat.sy:8443";

export default async function handler(request) {
  const origUrl = new URL(request.url);
  const targetUrl = new URL(TARGET_HOST);

  targetUrl.pathname = origUrl.pathname.replace(/^\/api\/proxy/, "");
  targetUrl.search = origUrl.search;

  const headers = new Headers(request.headers);

  headers.set("Host", targetUrl.hostname);
  headers.set("Origin", `https://${targetUrl.hostname}`);
  headers.set("Referer", `https://${targetUrl.hostname}${origUrl.pathname}`);
  headers.set("Sec-Fetch-Site", "same-site");
  headers.set("Sec-Fetch-Mode", "cors");
  headers.set("Sec-Fetch-Dest", "empty");
  headers.set("Alt-Used", targetUrl.hostname);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const proxiedRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: "manual",
  });

  let response;
  try {
    response = await fetch(proxiedRequest, { credentials: "include" });
  } catch (err) {
    return new Response("Bad gateway: " + err.toString(), { status: 502 });
  }

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "*");
  newHeaders.set("Access-Control-Allow-Credentials", "true");

  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
