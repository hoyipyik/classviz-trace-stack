# ClassViz

Getting started: run an HTTP server (e.g., `python -m http.server`) from the root directory of this project and browse it. There is also a `Dockerfile` if that's more your thing.

[Demo.](https://rsatrioadi.github.io/classviz/?p=jhotdraw-trc-sum-rs)

## Trace Plugin Usage

- Trace files are store in `/data/trace`.

- Please create `config.js` from `config.example.js`, don't forget to add your own apiUrl and apiKey.

### Large data test

The data we use here is a mock data. We use this data to test the performance of visualisation part only.

As the format is different, I make many changes in`process` folder to make it work.
