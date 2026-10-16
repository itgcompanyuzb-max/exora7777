/*
 * Exora datafeed for the TradingView Charting Library.
 * Implements the JS-API datafeed contract on top of the platform's own UDF endpoints (/api/tv)
 * and its /ws/trading WebSocket, so charts show the broker's prices — not a third-party feed.
 * Exposes window.Datafeeds.UDFCompatibleDatafeed(url) for drop-in use.
 */
(function () {
  'use strict';

  var RES_SUPPORTED = ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'];

  function resSeconds(r) {
    if (r === '1D' || r === 'D') return 86400;
    if (r === '1W' || r === 'W') return 604800;
    if (r === '1M' || r === 'M') return 2592000;
    var n = parseInt(r, 10);
    return (isNaN(n) ? 15 : n) * 60;
  }

  function getJson(url) {
    return fetch(url).then(function (r) {
      return r.json();
    });
  }

  function UDFCompatibleDatafeed(baseUrl) {
    var url = baseUrl.replace(/\/$/, '');
    var subs = {}; // guid -> { symbol, res, onTick, last }
    var ws = null;
    var retry = 0;

    function ensureSocket() {
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(proto + '//' + location.host + '/ws/trading');
      ws.onopen = function () { retry = 0; };
      ws.onmessage = function (ev) {
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type !== 'TICK') return;
        var t = m.data;
        Object.keys(subs).forEach(function (g) {
          var s = subs[g];
          if (s.symbol !== t.symbol || !s.last) return;
          var price = t.bid;
          var bucket = Math.floor(t.time / 1000 / s.sec) * s.sec * 1000;
          if (bucket > s.last.time) {
            s.last = { time: bucket, open: price, high: price, low: price, close: price, volume: 1 };
          } else {
            s.last.high = Math.max(s.last.high, price);
            s.last.low = Math.min(s.last.low, price);
            s.last.close = price;
            s.last.volume += 1;
          }
          s.onTick(Object.assign({}, s.last));
        });
      };
      ws.onclose = function () {
        if (!Object.keys(subs).length) return;
        setTimeout(ensureSocket, Math.min(15000, 500 * Math.pow(2, retry++)));
      };
    }

    return {
      onReady: function (cb) {
        getJson(url + '/config').then(function (c) {
          cb(c);
        }).catch(function () {
          cb({ supported_resolutions: RES_SUPPORTED, supports_time: true });
        });
      },

      searchSymbols: function (input, exchange, type, onResult) {
        getJson(url + '/search?query=' + encodeURIComponent(input) + '&type=' + encodeURIComponent(type || '') + '&limit=30')
          .then(onResult)
          .catch(function () { onResult([]); });
      },

      resolveSymbol: function (name, onResolve, onError) {
        var clean = String(name).split(':').pop();
        getJson(url + '/symbols?symbol=' + encodeURIComponent(clean)).then(function (info) {
          if (info.s === 'error') return onError(info.errmsg || 'unknown_symbol');
          info.full_name = 'EXORA:' + info.name;
          onResolve(info);
        }).catch(function () { onError('unknown_symbol'); });
      },

      getBars: function (info, resolution, period, onResult, onError) {
        var q = '/history?symbol=' + encodeURIComponent(info.ticker || info.name) + '&resolution=' + resolution +
          '&from=' + period.from + '&to=' + period.to + (period.countBack ? '&countback=' + period.countBack : '');
        getJson(url + q).then(function (d) {
          if (d.s === 'no_data') return onResult([], { noData: true, nextTime: d.nextTime });
          if (d.s !== 'ok') return onError(d.errmsg || 'history_error');
          var bars = d.t.map(function (t, i) {
            return { time: t * 1000, open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v[i] };
          });
          onResult(bars, { noData: false });
        }).catch(function (e) { onError(String(e)); });
      },

      subscribeBars: function (info, resolution, onTick, guid) {
        var sec = resSeconds(resolution);
        var sub = { symbol: info.ticker || info.name, res: resolution, sec: sec, onTick: onTick, last: null };
        subs[guid] = sub;
        // seed the in-progress bar from the latest history bar so live ticks extend it
        var now = Math.floor(Date.now() / 1000);
        getJson(url + '/history?symbol=' + encodeURIComponent(sub.symbol) + '&resolution=' + resolution + '&from=0&to=' + now + '&countback=1')
          .then(function (d) {
            if (d.s === 'ok' && subs[guid]) {
              var i = d.t.length - 1;
              subs[guid].last = { time: d.t[i] * 1000, open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v[i] };
            }
          });
        ensureSocket();
      },

      unsubscribeBars: function (guid) {
        delete subs[guid];
        if (!Object.keys(subs).length && ws) { ws.close(); ws = null; }
      },

      getServerTime: function (cb) {
        fetch(url + '/time').then(function (r) { return r.text(); }).then(function (t) { cb(parseInt(t, 10)); });
      },
    };
  }

  window.Datafeeds = window.Datafeeds || {};
  window.Datafeeds.UDFCompatibleDatafeed = UDFCompatibleDatafeed;
})();
