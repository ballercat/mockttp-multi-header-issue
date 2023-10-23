import http from "node:http";
import mockttp from "mockttp";
import fetch from "node-fetch";
import test from "ava";
import express from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import { promisify } from "node:util";

const promise = (cb, ...args) => {
  return new Promise((res, rej) => {
    args.push((err) => {
      if (err == null) {
        res();
        return;
      }
      rej(err);
    });
    cb(...args);
  });
};

test.serial("multi-headers, cors off (this will pass)", async (t) => {
  let serverCookieHeader;
  const proxy = mockttp.getLocal({ debug: true });
  await proxy.start();

  proxy
    .forAnyRequest()
    .forHost("multi-headers-mockttp-test.com")
    .thenForwardTo("http://localhost:42069", {
      beforeResponse(res) {
        serverCookieHeader = res.headers["set-cookie"];
      },
    });

  const app = express();
  app.use((req, res, next) => {
    res.cookie("bar", "bar");
    next();
  });
  app.get("*", (_, res) => {
    res.cookie("foo", "foo");
    res.status(200).send("OK");
  });

  const server = http.createServer(app);
  await promise(server.listen.bind(server), 42069);

  const opts = { agent: new HttpsProxyAgent(proxy.url) };

  const res = await fetch("http://multi-headers-mockttp-test.com/", opts);
  await proxy.stop();

  t.is(res.headers.get("set-cookie"), "bar=bar; Path=/, foo=foo; Path=/");
  t.is(res.headers.get("set-cookie"), serverCookieHeader.join(", "));

  await new Promise((res, rej) => {
    server.close((error) => {
      if (error) {
        rej(error);
      } else {
        server.unref();
        res();
      }
    });
  });
});

test.serial("multi-headers, cors on (this will fail)", async (t) => {
  let serverCookieHeader;
  const proxy = mockttp.getLocal({ debug: true, cors: true });
  await proxy.start();

  proxy
    .forAnyRequest()
    .forHost("multi-headers-mockttp-test.com")
    .thenForwardTo("http://localhost:42069", {
      beforeResponse(res) {
        serverCookieHeader = res.headers["set-cookie"];
      },
    });

  const app = express();
  app.use((req, res, next) => {
    res.cookie("bar", "bar");
    next();
  });
  app.get("*", (_, res) => {
    res.cookie("foo", "foo");
    res.status(200).send("OK");
  });

  const server = http.createServer(app);
  await promise(server.listen.bind(server), 42069);

  const opts = { agent: new HttpsProxyAgent(proxy.url) };

  const res = await fetch("http://multi-headers-mockttp-test.com/", opts);
  await proxy.stop();

  t.is(res.headers.get("set-cookie"), "bar=bar; Path=/, foo=foo; Path=/");
  t.is(res.headers.get("set-cookie"), serverCookieHeader.join(", "));

  await new Promise((res, rej) => {
    server.close((error) => {
      if (error) {
        rej(error);
      } else {
        server.unref();
        res();
      }
    });
  });
});
