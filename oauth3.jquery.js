(function () {
  'use strict';

  // I did try to shim jQuery's deferred, but it's just too clunky.
  // Here I use es6-promise which lacks asynchrity, but it's the smallest Promise implementation.
  // Only Opera Mini and MSIE (even on 11) will use this shim, so no biggie;

  var oauth3 = window.OAUTH3;
  var count = 0;

  function inject() {
    count += 1;

    if (count >= 100) {
      throw new Error("you forgot to include rsvp.js, methinks");
    }

    var PromiseA = window.Promise || window.ES6Promise;
    if ('undefined' !== typeof PromiseA) {
      oauth3.providePromise(PromiseA).then(function () {
        // ignore
        window.jqOauth3 = oauth3;
      }, function (err) {
        console.error(err);
        console.error("Bad Promise Implementation!");
      });
      return;
    }


    setTimeout(inject, 100);
  }

  if ('undefined' === typeof Promise) {
    // support Opera Mini and MSIE 11+ (which doesn't support <!-- [if IE]> detection)
    /* jshint ignore: start */
    document.write('<script src="bower_components/es6-promise/promise.min.js"></script>');
    /* jshint ignore: end */

    /*
    // I would have used this, but it turns out that
    // MSIE can't tell when a script has loaded
    var js = document.createElement("script");
    js.setAttribute("src", "bower_components/es6-promise/promise.js");
    js.setAttribute("type", "text/javascript");
    document.getElementsByTagName("head")[0].appendChild(js);
    */
  }

  inject();

  function Request(opts) {
    if (!opts.method) {
      throw new Error("Developer Error: you must set method as one of 'GET', 'POST', 'DELETE', etc");
    }

    var req = {
      url: opts.url
      // Noted: jQuery 1.9 finally added 'method' as an alias of 'type'
    , method: opts.method
      // leaving type for backwards compat
    , type: opts.method
    , headers: opts.headers
    };

    // don't allow accidetal querystring via 'data'
    if (opts.data && !/get|delete/i.test(opts.method)) {
      req.data = opts.data;
    }

    // I don't trust jQuery promises...
    return new oauth3.PromiseA(function (resolve, reject) {
      $.ajax(req).then(function (data, textStatus, jqXhr) {
        var resp = {};

        Object.keys(jqXhr).forEach(function (key) {
          // particularly we have to get rid of .then
          if ('function' !== typeof jqXhr[key]) {
            resp[key] = jqXhr[key];
          }
        });

        resp.data = data;
        resp.status = textStatus;
        resp.request = jqXhr;
        resolve(resp);
      }, function (jqXhr, textStatus, errorThrown) {
        errorThrown.request = jqXhr;
        errorThrown.response = jqXhr;
        errorThrown.status = textStatus;
        reject(errorThrown);
      });
    });
  }

  oauth3.provideRequest(Request);
}());
