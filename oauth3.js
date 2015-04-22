(function (exports) {
  'use strict';

  var oauth3 = {};
  var logins = {};
  oauth3.requests = logins;

  if ('undefined' !== typeof Promise) {
    oauth3.PromiseA = Promise;
  } else {
    console.warn("[oauth3.js] Remember to call oauth3.providePromise(Promise) with a proper Promise implementation");
  }

  // TODO move to a test / lint suite?
  oauth3._testPromise = function (PromiseA) {
    var promise;
    var x = 1;

    // tests that this promise has all of the necessary api
    promise = new PromiseA(function (resolve, reject) {
      if (x === 1) {
        throw new Error("bad promise, create not asynchronous");
      }

      PromiseA.resolve().then(function () {
        var promise2;

        if (x === 1 || x === 2) {
          throw new Error("bad promise, resolve not asynchronous");
        }

        promise2 = PromiseA.reject().then(reject, function () {
          if (x === 1 || x === 2 || x === 3) {
            throw new Error("bad promise, reject not asynchronous");
          }

          if ('undefined' === typeof angular) {
            throw new Error("[NOT AN ERROR] Dear angular users: ignore this error-handling test");
          } else {
            return PromiseA.reject(new Error("[NOT AN ERROR] ignore this error-handling test"));
          }
        });

        x = 4;

        return promise2;
      }).catch(function (e) {
        if (e.message.match('NOT AN ERROR')) {
          resolve({ success: true });
        } else {
          reject(e);
        }
      });

      x = 3;
    });

    x = 2;
    return promise;
  };

  oauth3.providePromise = function (PromiseA) {
    oauth3.PromiseA = PromiseA;
    return oauth3._testPromise(PromiseA).then(function () {
      oauth3.PromiseA = PromiseA;
    });
  };

  oauth3.provideRequest = function (request, opts) {
    opts = opts || {};
    var Recase = exports.Recase || require('recase');
    // TODO make insensitive to providing exceptions
    var recase = Recase.create({ exceptions: {} });

    if (opts.rawCase) {
      oauth3.request = request;
      return;
    }

    // Wrap oauth3 api calls in snake_case / camelCase conversion
    oauth3.request = function (req, opts) {
      opts = opts || {};

      if (opts.rawCase) {
        return request(req);
      }

      // convert JavaScript camelCase to oauth3 snake_case
      if (req.data && 'object' === typeof req.data) {
        req.originalData = req.data;
        req.data = recase.snakeCopy(req.data);
      }

      return request(req).then(function (resp) {
        // convert oauth3 snake_case to JavaScript camelCase
        if (resp.data && 'object' === typeof resp.data) {
          resp.originalData = resp.data;
          resp.data = recase.camelCopy(resp.data);
        }
        return resp;
      });
    };

    /*
    return oauth3._testRequest(request).then(function () {
      oauth3.request = request;
    });
    */
  };

  logins.authorizationRedirect = function (providerUri, opts) {
    // TODO get own directives
    return oauth3.authorizationRedirect(
      providerUri
    , opts.authorizationRedirect
    , opts
    ).then(function (prequest) {
      if (!prequest.state) {
        throw new Error("[Devolper Error] [authorization redirect] prequest.state is empty");
      }

      return oauth3.frameRequest(prequest.url, prequest.state, opts);
    });
  };

  logins.implicitGrant = function (providerUri, opts) {
    // TODO OAuth3 provider should use the redirect URI as the appId?
    return oauth3.implicitGrant(
      providerUri
      // TODO OAuth3 provider should referer / origin as the appId?
    , opts
    ).then(function (prequest) {
      // console.log('[debug] prequest', prequest);
      if (!prequest.state) {
        throw new Error("[Devolper Error] [implicit grant] prequest.state is empty");
      }

      return oauth3.frameRequest(prequest.url, prequest.state, opts);
    });
  };

  logins.resourceOwnerPassword = function (providerUri, username, passphrase, opts) {
    var scope = opts.scope;
    var appId = opts.appId;
    return oauth3.resourceOwnerPassword(
      providerUri
    , username
    , passphrase
    , scope
    , appId
    ).then(function (request) {
      return oauth3.request({
        url: request.url
      , method: request.method
      , data: request.data
      });
    });
  };

  oauth3.frameRequest = function (url, state, opts) {
    var promise;

    if ('background' === opts.type) {
      promise = oauth3.insertIframe(url, state, opts);
    } else if ('popup' === opts.type) {
      promise = oauth3.openWindow(url, state, opts);
    } else {
      throw new Error("login framing method not specified or not type yet implemented");
    }

    return promise.then(function (params) {
      var err;

      if (params.error || params.error_description) {
        err = new Error(params.error_description || "Unknown response error");
        err.code = params.error || "E_UKNOWN_ERROR";
        err.params = params;
        return oauth3.PromiseA.reject(err); 
      }

      return params;
    });
  };

  oauth3.login = function (providerUri, opts) {
    // Four styles of login:
    //   * background (hidden iframe)
    //   * iframe (visible iframe, needs border color and width x height params)
    //   * popup (needs width x height and positioning? params)
    //   * window (params?)

    // Two strategies
    //  * authorization_redirect (to server authorization code)
    //  * implicit_grant (default, browser-only)
    // If both are selected, implicit happens first and then the other happens in background

    var promise;

    if (opts.username || opts.password) {
      /* jshint ignore:start */
      // ingore "confusing use of !"
      if (!opts.username !== !opts.password) {
        throw new Error("you did not specify both username and password");
      }
      /* jshint ignore:end */

      var username = opts.username;
      var password = opts.password;
      delete opts.username;
      delete opts.password;

      return logins.resourceOwnerPassword(providerUri, username, password, opts);
    }

    // TODO support dual-strategy login
    // by default, always get implicitGrant (for client)
    // and optionally do authorizationCode (for server session)
    if ('background' === opts.type || opts.background) {
      opts.type = 'background';
      opts.background = true;
    }
    else {
      opts.type = 'popup';
      opts.popup = true;
    }
    if (opts.authorizationRedirect) {
      promise = logins.authorizationRedirect(providerUri, opts);
    }
    else {
      promise = logins.implicitGrant(providerUri, opts);
    }

    return promise;
  };

  oauth3.backgroundLogin = function (providerUri, opts) {
    opts = opts || {};
    opts.type = 'background';
    return oauth3.login(providerUri, opts);
  };

  oauth3.insertIframe = function (url, state, opts) {
    opts = opts || {};
    var promise = new oauth3.PromiseA(function (resolve, reject) {
      var tok;
      var $iframe;

      function cleanup() {
        delete window['__oauth3_' + state];
        $iframe.remove();
        clearTimeout(tok);
        tok = null;
      }

      window['__oauth3_' + state] = function (params) {
        //console.info('[iframe] complete', params);
        resolve(params);
        cleanup();
      };

      tok = setTimeout(function () {
        var err = new Error("the iframe request did not complete within 15 seconds");
        err.code = "E_TIMEOUT";
        reject(err);
        cleanup();
      }, opts.timeout || 15000);

      // TODO hidden / non-hidden (via directive even)
      $iframe = $(
        '<iframe src="' + url
      //+ '" width="800px" height="800px" style="opacity: 0.8;" frameborder="1"></iframe>'
      + '" width="1px" height="1px" style="opacity: 0.01;" frameborder="0"></iframe>'
      );

      $('body').append($iframe);
    });

    // TODO periodically garbage collect expired handlers from window object
    return promise;
  };

  oauth3.openWindow = function (url, state, opts) {
    var promise = new oauth3.PromiseA(function (resolve, reject) {
      var winref;
      var tok;

      function cleanup() {
        delete window['__oauth3_' + state];
        clearTimeout(tok);
        tok = null;
        // this is last in case the window self-closes synchronously
        // (should never happen, but that's a negotiable implementation detail)
        //winref.close();
      }

      window['__oauth3_' + state] = function (params) {
        //console.info('[popup] (or window) complete', params);
        resolve(params);
        cleanup();
      };

      tok = setTimeout(function () {
        var err = new Error("the windowed request did not complete within 3 minutes");
        err.code = "E_TIMEOUT";
        reject(err);
        cleanup();
      }, opts.timeout || 3 * 60 * 1000);

      // TODO allow size changes (via directive even)
      winref = window.open(url, 'oauth3-login-' + state, 'height=720,width=620');
      if (!winref) {
        reject("TODO: open the iframe first and discover oauth3 directives before popup");
        cleanup();
      }
    });

    // TODO periodically garbage collect expired handlers from window object
    return promise;
  };

  oauth3.logout = function (providerUri, opts) {
    opts = opts || {};

    // Oauth3.init({ logout: function () {} });
    //return Oauth3.logout();

    var promise;
    var state = parseInt(Math.random().toString().replace('0.', ''), 10).toString('36');
    var url = providerUri + (opts.providerOauth3Html || '/oauth3.html#');
    var params = {
      // logout=true for all logins/accounts
      // logout=app-scoped-login-id for a single login
      action: 'logout'
      // TODO specify specific accounts / logins to delete from session
    , accounts: true
    , logins: true
    , redirect_uri: opts.redirectUri || (window.location.protocol + '//' + window.location.host
        + window.location.pathname + 'oauth3.html')
    , state: state
    };

    url += oauth3.querystringify(params);

    promise = oauth3.insertIframe(url, state, opts);

    return promise;
  };

  oauth3.stringifyscope = function (scope) {
    if (Array.isArray(scope)) {
      scope = scope.join(' ');
    }
    return scope;
  };

  oauth3.querystringify = function (params) {
    var qs = [];

    Object.keys(params).forEach(function (key) {
      if ('scope' === key) {
        params[key] = oauth3.stringifyscope(params[key]);
      }
      qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    });

    return qs.join('&');
  };

  oauth3.createState = function () {
    // TODO mo' betta' random function
    // maybe gather some entropy from mouse / keyboard events?
    // (probably not, just use webCrypto or be sucky)
    return parseInt(Math.random().toString().replace('0.', ''), 10).toString('36');
  };

  oauth3.normalizeProviderUri = function (providerUri) {
    // tested with
    //   example.com
    //   example.com/
    //   http://example.com
    //   https://example.com/
    providerUri = providerUri
      .replace(/^(https?:\/\/)?/, 'https://')
      .replace(/\/?$/, '')
      ;

    return providerUri;
  };

  oauth3._discoverHelper = function (providerUri, opts) {
    opts = opts || {};
    var state = oauth3.createState();
    var params;
    var url;

    params = {
      action: 'directives'
    , state: state
      // TODO this should be configurable (i.e. I want a dev vs production oauth3.html)
    , redirect_uri: window.location.protocol + '//' + window.location.host
        + window.location.pathname + 'oauth3.html'
    };

    url = providerUri + '/oauth3.html#' + oauth3.querystringify(params);

    return oauth3.insertIframe(url, state, opts).then(function (directives) {
      return directives;
    }, function (err) {
      return oauth3.PromiseA.reject(err);
    });
  };

  oauth3.discover = function (providerUri, opts) {
    opts = opts || {};

    if (opts.directives) {
      return oauth3.PromiseA.resolve(opts.directives);
    }

    var promise;
    var directives;
    var updatedAt;
    var fresh;

    providerUri = oauth3.normalizeProviderUri(providerUri);
    try {
      directives = JSON.parse(localStorage.getItem('oauth3.' + providerUri + '.directives'));
      updatedAt = new Date(localStorage.getItem('oauth3.' + providerUri + '.directives.updated_at')).valueOf();
    } catch(e) {
      // ignore
    }

    fresh = Date.now() - updatedAt < (24 * 60 * 60 * 1000);

    if (directives) {
      promise = oauth3.PromiseA.resolve(directives);
    }

    if (fresh) {
      //console.log('[local] [fresh directives]', directives);
      return promise;
    }

    promise = promise || oauth3._discoverHelper(providerUri, opts).then(function (params) {
      var err;

      if (!params.directives) {
        err = new Error(params.error_description || "Unknown error when discoving provider '" + providerUri + "'");
        err.code = params.error || "E_UNKNOWN_ERROR";
        return oauth3.PromiseA.reject(err);
      }

      try {
        directives = JSON.parse(atob(params.directives));
      } catch(e) {
        err = new Error(params.error_description || "could not parse directives for provider '" + providerUri + "'");
        err.code = params.error || "E_PARSE_DIRECTIVE";
        return oauth3.PromiseA.reject(err);
      }

      if (directives.authorization_dialog && directives.authorization_dialog.url) {
        // TODO lint directives
        localStorage.setItem('oauth3.' + providerUri + '.directives', JSON.stringify(directives));
        localStorage.setItem('oauth3.' + providerUri + '.directives.updated_at', new Date().toISOString());

        return oauth3.PromiseA.resolve(directives);
      } else {
        // ignore
        console.error("the directives provided by '" + providerUri + "' were invalid.");
        params.error = params.error || "E_INVALID_DIRECTIVE";
        params.error_description = params.error_description
          || "directives did not include authorization_dialog.url";
        err = new Error(params.error_description || "Unknown error when discoving provider '" + providerUri + "'");
        err.code = params.error;
        return oauth3.PromiseA.reject(err);
      }
    });

    return promise;
  };

  oauth3.authorizationRedirect = function (providerUri, authorizationRedirect, opts) {
    //console.log('[authorizationRedirect]');
    //
    // Example Authorization Redirect - from Browser to Consumer API
    // (for generating a session securely on your own server)
    //
    // i.e. GET https://<<CONSUMER>>.com/api/oauth3/authorization_redirect/<<PROVIDER>>.com
    //
    // GET https://myapp.com/api/oauth3/authorization_redirect/`encodeURIComponent('example.com')`
    //  &scope=`encodeURIComponent('profile.login profile.email')`
    //
    // (optional)
    //  &state=`Math.random()`
    //  &redirect_uri=`encodeURIComponent('https://myapp.com/oauth3.html')`
    //
    // NOTE: This is not a request sent to the provider, but rather a request sent to the
    // consumer (your own API) which then sets some state and redirects.
    // This will initiate the `authorization_code` request on your server
    //
    opts = opts || {};

    return oauth3.discover(providerUri, opts).then(function (directive) {
      if (!directive) {
        throw new Error("Developer Error: directive should exist when discovery is successful");
      }

      var scope = opts.scope || directive.authn_scope;

      var state = Math.random().toString().replace(/^0\./, '');
      var params = {};
      var slimProviderUri = encodeURIComponent(providerUri.replace(/^(https?|spdy):\/\//, ''));

      params.state = state;
      if (scope) {
        params.scope = scope;
      }
      if (opts.redirectUri) {
        // this is really only for debugging
        params.redirect_uri = opts.redirectUri;
      }
      // Note: the type check is necessary because we allow 'true'
      // as an automatic mechanism when it isn't necessary to specify
      if ('string' !== typeof authorizationRedirect) {
        // TODO oauth3.json for self?
        authorizationRedirect = 'https://' + window.location.host
          + '/api/oauth3/authorization_redirect/:provider_uri';
      }
      authorizationRedirect = authorizationRedirect
        .replace(/!(provider_uri)/, slimProviderUri)
        .replace(/:provider_uri/, slimProviderUri)
        .replace(/#{provider_uri}/, slimProviderUri)
        .replace(/{{provider_uri}}/, slimProviderUri)
        ;

      return oauth3.PromiseA.resolve({
        url: authorizationRedirect + '?' + oauth3.querystringify(params)
      , method: 'GET'
      , state: state    // this becomes browser_state
      , params: params  // includes scope, final redirect_uri?
      });
    });
  };

  oauth3.authorizationCode = function (/*providerUri, scope, redirectUri, clientId*/) {
    //
    // Example Authorization Code Request
    // (not for use in the browser)
    //
    // GET https://example.com/api/oauth3/authorization_dialog
    //  ?response_type=code
    //  &scope=`encodeURIComponent('profile.login profile.email')`
    //  &state=`Math.random()`
    //  &client_id=xxxxxxxxxxx
    //  &redirect_uri=`encodeURIComponent('https://myapp.com/oauth3.html')`
    //
    // NOTE: `redirect_uri` itself may also contain URI-encoded components
    //
    // NOTE: This probably shouldn't be done in the browser because the server
    //   needs to initiate the state. If it is done in a browser, the browser
    //   should probably request 'state' from the server beforehand
    //

    throw new Error("not implemented");
  };

  oauth3.implicitGrant = function (providerUri, opts) {
    //console.log('[implicitGrant]');
    //
    // Example Implicit Grant Request
    // (for generating a browser-only session, not a session on your server)
    //
    // GET https://example.com/api/oauth3/authorization_dialog
    //  ?response_type=token
    //  &scope=`encodeURIComponent('profile.login profile.email')`
    //  &state=`Math.random()`
    //  &client_id=xxxxxxxxxxx
    //  &redirect_uri=`encodeURIComponent('https://myapp.com/oauth3.html')`
    //
    // NOTE: `redirect_uri` itself may also contain URI-encoded components
    //

    opts = opts || {};
    var type = 'authorization_dialog';
    var responseType = 'token';

    return oauth3.discover(providerUri, opts).then(function (directive) {
      var redirectUri = opts.redirectUri;
      var scope = opts.scope || directive.authn_scope;
      var clientId = opts.appId;
      var args = directive[type];
      var uri = args.url;
      var state = Math.random().toString().replace(/^0\./, '');
      var params = {};
      var loc;
      var result;

      params.state = state;
      params.response_type = responseType;
      if (scope) {
        if (Array.isArray(scope)) {
          scope = scope.join(' ');
        }
        params.scope = scope;
      }
      if (clientId) {
        // In OAuth3 client_id is optional for implicit grant
        params.client_id = clientId;
      }
      if (!redirectUri) {
        loc = window.location;
        redirectUri = loc.protocol + '//' + loc.host + loc.pathname;
        if ('/' !== redirectUri[redirectUri.length - 1]) {
          redirectUri += '/';
        }
        redirectUri += 'oauth3.html';
      }
      params.redirect_uri = redirectUri;

      uri += '?' + oauth3.querystringify(params);

      result = {
        url: uri
      , state: state
      , method: args.method
      , query: params
      };
      return oauth3.PromiseA.resolve(result);
    });
  };

  oauth3.resourceOwnerPassword = function (providerUri, username, passphrase, opts) {
    //
    // Example Resource Owner Password Request
    // (generally for 1st party and direct-partner mobile apps, and webapps)
    //
    // POST https://example.com/api/oauth3/access_token
    //    { "grant_type": "password", "client_id": "<<id>>", "scope": "<<scope>>"
    //    , "username": "<<username>>", "password": "password" }
    //
    opts = opts || {};
    var type = 'access_token';
    var grantType = 'password';

    return oauth3.discover(providerUri, opts).then(function (directive) {
      var scope = opts.scope || directive.authn_scope;
      var clientId = opts.appId;
      var args = directive[type];
      var params = {
        "grant_type": grantType
      , "username": username
      , "password": passphrase
      };
      var uri = args.url;
      var body;

      if (clientId) {
        params.clientId = clientId;
      }
      if (scope) {
        if (Array.isArray(scope)) {
          scope = scope.join(' ');
        }
        params.scope = scope;
      }

      if ('GET' === args.method.toUpperCase()) {
        uri += '?' + oauth3.querystringify(params);
      } else {
        body = params;
      }

      return {
        url: uri
      , method: args.method
      , data: body
      };
    });
  };

  exports.OAUTH3 = oauth3.oauth3 = oauth3.OAUTH3 = oauth3;
  exports.oauth3 = exports.OAUTH3;

  if ('undefined' !== typeof module) {
    module.exports = oauth3;
  }
}('undefined' !== typeof exports ? exports : window));
