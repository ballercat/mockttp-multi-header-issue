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
