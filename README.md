# bower-oauth3

OAuth2 / OAuth3 Components for Bower

This provides the html and JavaScript necessary to perform **seemless cross-domain authentication** from an **OAuth3 consumer** app (i.e. &lt;&lt;Your App>>, Imgur, Pinterest, BitBucket) to an **OAuth2 or OAuth3 service provider** (i.e. Facebook, Pinterest, Github).

* Vanilla JavaScript: `oauth3.js`
* jQuery wrapper: `oauth3.jquery.js`
* AngularJS wrapper: `angular-oauth3.js`

Note: The wrappers are *very* thin.

## oauth3.html

framework agnostic utilities for seemless login, logout, user switching, and scope elevation via iframe and popup.

## oauth3.js

**Public API**

* `window.OAUTH3.login(providerUri, options)`
* `window.OAUTH3.backgroundLogin(providerUri, options)`
* `window.OAUTH3.logout(providerUri, options)` (todo: spec for oauth3.json)
* `window.OAUTH3.discover(providerUri)`
* `window.OAUTH3.providePromise(PromiseA)`
* `window.OAUTH3.provideRequest(HttpRequest)`
* `window.OAUTH3.normalizeProviderUri(providerUri)`
  * (i.e. turns 'example.com/' into 'https://example.com')
* `window.OAUTH3.querystringify(obj)`
  * properly encodes and stringifies both keys and values of query parameters
* `window.OAUTH3.stringifyscope(scope)`
  * returns space-delimited string from string or array

**Private API**

* `oauth3.createState()` creates a psuedorandom state
* `oauth3.frameRequest(url, state, opts)` chooses window, popup, visible iframe, or hidden iframe
* `oauth3.openWindow(url, state, opts)` (todo params for height, width, etc)
* `oauth3.insertIframe(url, state, opts)` (todo params for visibility, height, width)
* `oauth3._testPromise(PromiseA)`
* `oauth3._discoverHelper(providerUri)`

### `window.OAUTH3.login(providerUri, options)`

`providerUri` is a string in the format `https://example-provider.com`

`options` are as follows:

* scope (space delimited string or array)
* implicitGrant
* authorizationCode
* resourceOwnerPasword
  * username
  * password
* appId
* type (one of 'background', 'popup', 'window', 'iframe')

#### Example: Implicit Grant (browser-only)

```
var promise = window.OAUTH3.login(
  "https://ldsconnect.org"
, { type: 'popup', appId: 'TEST_ID_9e78b54c44a8746a5727c972' }
);

promise.then(function (params) {
  console.log('my login complete params', params);
}, function (err) {
  console.log('a handle-able error', err);
}).catch(function (err) {
  console.log('an exceptional error', err);
});
```

#### Example: Authorization Code (browser-server)

```
var promise = window.OAUTH3.login(
  "https://ldsconnect.org"
, { type: 'popup'
  , authorizationCode: true
  , appId: 'TEST_ID_9e78b54c44a8746a5727c972'
  }
);

promise.then(function (params) {
  console.log('my login complete params', params);
}, function (err) {
  console.log('a handle-able error', err);
}).catch(function (err) {
  console.log('an exceptional error', err);
});
```

#### Example: Resource Owner Password (1st party, mobile, etc)

Note: This is for 1st party apps. As a consumer you will probably not use these.

```
var promise = window.OAUTH3.login(
  "https://ldsconnect.org"
, { type: 'popup'
  , username: 'john.doe'
  , password: 'super secret'
  , appId: 'TEST_ID_9e78b54c44a8746a5727c972'
  }
);

promise.then(function (params) {
  console.log('my login complete params', params);
}, function (err) {
  console.log('a handle-able error', err);
}).catch(function (err) {
  console.log('an exceptional error', err);
});
```

#### Example: Client Credentials

For when you want to authenticate a client (browser or server)

*TODO*

I'm pretty sure this is per-request, just like `Authorization: Basic`
so there is no login, but I need to double check.

In any case, the client would use the client id.
The server would use both the client id and the secret.

### `window.OAUTH3.backgroundLogin(providerUri, options)`

Same as the above, except that it opens a hidden iframe.

The login will succeed or fail immediately depending on whether or not
the user has already granted your requested scopes.

### `window.OAUTH3.logout(providerUri, options)`

Currently logs you out of all logins and accounts of the provider
(i.e. you can't use `backgroundLogin()` to get a token)

It should allow for granular selection, but we're not there yet.

```
var promise = window.OAUTH3.logout('https://ldsconnect.org');

promise.then(function () {
  // success
}, function (err) {
  // most likely the logout timed out due to an improper implementation
  // on the provider's end (not your fault)
}).catch(function (err) {
  // I don't think this should ever happen
});
```

### `window.OAUTH3.discover(providerUri)`

This fetches https://example-provider.com/oauth3.json through https://example-provider.com/oauth3.html.

OAuth3 implementors SHOULD provide CORS access, however, since it's easier to give someone an HTML file
to stick in their root than to educate or provide a library for CORS access, oauth3.html is used as a fallback.

```
var promise = window.OAUTH3.discover("https://ldsconnect.org");

promise.then(function (directives) {
  console.log('oauth2 / oauth3 directives', directives);
}, function (err) {
  console.log('a handle-able error', err);
}).catch(function (err) {
  console.log('an exceptional error', err);
});
```

### `window.OAUTH3.providePromise(PromiseA)`

**Note**: the wrapper libraries do this for you. You probably don't need to call this.

This must be called with the preferred promise implementation with the following API:

* `new Promise(function (resolve, reject) { ... }).then(successCb, errorCb).catch(exceptionCb)`
* `Promise.resolve(data)`
* `Promise.reject(error)`

All modern browsers support this. For some frameworks, however, it's easiest to use their implementation.

Examples:

* angular
  * `$q`  (requires thin wrapper)
  * `window.angular.element(document.body).injector().get('$q')`
* jQuery
  * `Deferred` (requires thin wrapper)
  * `window.jQuery.Deferred`

### `window.OAUTH3.provideRequest(request)`

**Note**: the wrapper libraries do this for you. You probably don't need to call this.

This must be called with the preferred http request implementation with the following API:

* `var promise = request.({ url: ... , method: ... , query: ..., body: ..., headers: ... });`

Example:

```
request({
  url: 'https://ldsconnect.org/api/oauth3/resource_owner_password'
, method: 'GET'
, body: { username: 'john.doe', password: 'super secret', client_id: 'TEST_ID_<<id>>' }
});
```

## oauth3.jquery.js

*TODO*

## angular-oauth3.js

Utilities which return appropriate urls and request parameters for various login types.

* `window.ngOauth3`
* `Oauth3.implicitGrant(provider_uri, scope, redirect_uri, client_id)`
* `Oauth3.authorizationCode(provider_uri, scope, redirect_uri, client_id)`

Notes

* *client_id* is not required for the implicit grant (browser only) strategy for true oauth3
* The app id is the last parameter because true lientId

## OAuth2 Security Concerns

These are issues that exist in OAuth2 and I need to think about them and consider how OAuth2 addresses them and how OAuth3 can address them.

* iOS: Can I steal a client_id from a webapp and then use it in a mobile webview to pose as that app?
* FxOS: I can hijack a redirect for any arbitrary domain (see manifest.json docs): 
  * (mitigated) must pass app review process, so this is not likely
  * (mitigated) user must have logged in *within* a window in the app, so this is not likely

### password vs passphrase vs key

It is recommended to require 12+ character passphrases.

Theory: It would be recommended to generate and passphrase-encrypt a key in the client,
however, the mechanisms for backing up and recovering that key across devices is still unclear.

Check back later.
