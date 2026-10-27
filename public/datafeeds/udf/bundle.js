// Minimal UDF-compatible datafeed for the TradingView Charting Library.
// Talks to the /api/tv routes (server/tradingViewUdf.ts).
(function (global) {
  function UDFCompatibleDatafeed(baseUrl, updateFrequency) {
    this._url = baseUrl.replace(/\/$/, '');
    this._freq = updateFrequency || 3000;
    this._subs = {};
  }

  UDFCompatibleDatafeed.prototype._get = function (path, params) {
    var qs = Object.keys(params || {})
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return fetch(this._url + path + (qs ? '?' + qs : '')).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  };

  UDFCompatibleDatafeed.prototype.onReady = function (cb) {
    this._get('/config').then(function (c) { setTimeout(function () { cb(c); }, 0); })
      .catch(function () { setTimeout(function () { cb({ supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'] }); }, 0); });
  };

  UDFCompatibleDatafeed.prototype.searchSymbols = function (input, exchange, type, onResult) {
    this._get('/search', { query: input, limit: 30 }).then(onResult).catch(function () { onResult([]); });
  };

  UDFCompatibleDatafeed.prototype.resolveSymbol = function (name, onResolve, onError) {
    this._get('/symbols', { symbol: name }).then(function (info) {
      setTimeout(function () { onResolve(info); }, 0);
    }).catch(function (e) { onError(String(e)); });
  };

  UDFCompatibleDatafeed.prototype.getBars = function (symbolInfo, resolution, periodParams, onResult, onError) {
    this._get('/history', {
      symbol: symbolInfo.ticker || symbolInfo.name,
      resolution: resolution,
      from: periodParams.from,
      to: periodParams.to,
      countback: periodParams.countBack
    }).then(function (d) {
      if (d.s !== 'ok') return onResult([], { noData: true });
      var bars = [];
      for (var i = 0; i < d.t.length; i++) {
        bars.push({ time: d.t[i] * 1000, open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v ? d.v[i] : 0 });
      }
      onResult(bars, { noData: bars.length === 0 });
    }).catch(function (e) { onError(String(e)); });
  };

  UDFCompatibleDatafeed.prototype.subscribeBars = function (symbolInfo, resolution, onTick, uid) {
    var self = this, last = null;
    var step = resolution === '1D' || resolution === 'D' ? 86400 : resolution === '1W' || resolution === 'W' ? 604800 : parseInt(resolution, 10) * 60;
    this._subs[uid] = setInterval(function () {
      var now = Math.floor(Date.now() / 1000);
      self._get('/history', { symbol: symbolInfo.ticker || symbolInfo.name, resolution: resolution, from: now - step * 3, to: now, countback: 2 })
        .then(function (d) {
          if (d.s !== 'ok' || !d.t.length) return;
          var i = d.t.length - 1;
          var bar = { time: d.t[i] * 1000, open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v ? d.v[i] : 0 };
          if (last && bar.time < last) return;
          last = bar.time;
          onTick(bar);
        }).catch(function () {});
    }, this._freq);
  };

  UDFCompatibleDatafeed.prototype.unsubscribeBars = function (uid) {
    clearInterval(this._subs[uid]);
    delete this._subs[uid];
  };

  global.Datafeeds = { UDFCompatibleDatafeed: UDFCompatibleDatafeed };
})(window);
