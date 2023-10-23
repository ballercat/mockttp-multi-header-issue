# Multi Headers issue with CORS enabled

```
yarn
yarn test
```

One test should pass and one should fail. Both test are identical except that the
failing spec is enabling cors via `mockServer.getLocal({ cors: true })`

The problem is that the way headers are passed to `writeHead` is broken when there
is already an existing header in the `ServerResponse`. In these cases (like when cors is on),
`writeHead` will run `setHeader` on each entry and simply mangle headers that are intended to
be multi values/arrays.

Here is the failing spec

```js
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
```
