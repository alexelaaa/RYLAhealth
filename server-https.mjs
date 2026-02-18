import { createServer } from "https";
import { readFileSync } from "fs";
import { parse } from "url";
import next from "next";

const dev = true;
const app = next({ dev, hostname: "0.0.0.0", port: 3000 });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync("./certificates/localhost-key.pem"),
  cert: readFileSync("./certificates/localhost.pem"),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, "0.0.0.0", () => {
    console.log("> HTTPS server ready on https://0.0.0.0:3000");
    console.log("> Phone: https://192.168.4.89:3000");
  });
});
