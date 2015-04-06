'use strict';

angular
  .module('oauth3', [])
  .service('Oauth3', [
    '$window'
  , '$timeout'
  , '$q'
  , '$http'
  , function Oauth3($window, $timeout, $q, $http) {
    var oauth3 = {};

    oauth3.states = {};

    oauth3.querystringify = function (params) {
      var qs = '';

      Object.keys(params).forEach(function (key) {
        qs += key + '=' + encodeURIComponent(params[key]);
      });

      return qs;
    };

    oauth3.discover = function (providerUri) {
      // TODO actually retrieve {{providerUri}}/oauth3.json
      // (and store in cache)
      return $q.when({
        "authorization_dialog": {
          "method": "GET"
        , "url": providerUri + '/api/oauth3/authorization_dialog'
        }
      , "access_token": {
          "method": "POST"
        , "url": providerUri + '/api/oauth3/access_token'
        }
      , "scope": "me"
      });
    };

    oauth3.authorizationCode = function (providerUri, scope, redirectUri, clientId) {
      //
      // Example Authorization Code Request
      //
      // GET https://example.com/api/oauth3/authorization_dialog
      //  ?response_type=code
      //  &scope=`encodeURIComponent('profile.login profile.email')`
      //  &state=`Math.random()`
      //  &client_id=xxxxxxxxxxx
      //  &redirect_uri=
      //    `encodeURIComponent('https://other.com/'
      //       + '?provider_uri=' + ``encodeURIComponent('https://example.com')``
      //    )`
      //
      // NOTE: `redirect_uri` itself may also contain URI-encoded components
      //

      throw new Error("not implemented");
    };

    oauth3.implicitGrant = function (providerUri, scope, redirectUri, clientId) {
      //
      // Example Implicit Grant Request
      //
      // GET https://example.com/api/oauth3/authorization_dialog
      //  ?response_type=token
      //  &scope=`encodeURIComponent('profile.login profile.email')`
      //  &state=`Math.random()`
      //  &client_id=xxxxxxxxxxx
      //  &redirect_uri=
      //    `encodeURIComponent('https://other.com/'
      //       + '?provider_uri=' + ``encodeURIComponent('https://example.com')``
      //    )`
      //
      // NOTE: `redirect_uri` itself may also contain URI-encoded components
      //
      var type = 'authorization_dialog';
      var responseType = 'token';

      return oauth3.discover(providerUri).then(function (directive) {
        var args = directive[type];
        var uri = args.url;
        var state = Math.random().toString().replace(/^0\./, '');
        var params = {};
        var rparams = { provider_uri: providerUri };

        // TODO nix rparams if we can do this with state alone
        oauth3.states[state] = {
          providerUri: providerUri
        , createdAt: new Date().toISOString()
        };

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
          // TODO use window.location + oauth3.html
        }
        redirectUri += '?' + oauth3.querystringify(rparams);
        params.redirect_uri = redirectUri;
      
        uri += '?' + oauth3.querystringify(params);

        return {
          url: uri
        , state: state
        , method: args.method
        , query: params
        };
      });
    };

    oauth3.resourceOwnerPassword = function (providerUri, username, passphrase, scope, clientId) {
      //
      // Example Resource Owner Password Request
      //
      // POST https://example.com/api/oauth3/access_token
      //    { "grant_type": "password", "client_id": "<<id>>", "scope": "<<scope>>"
      //    , "username": "<<username>>", "password": "password" }
      //
      var type = 'access_token';
      var grantType = 'password';

      return oauth3.discover(providerUri).then(function (directive) {
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
        }
      });
    };

    $window.ngOauth3 = oauth3;

    return oauth3;
  }])
  ;
