# bower-oauth3
OAuth2 / OAuth3 Components for Bower

This provides the html and JavaScript necessary to perform **seemless cross-domain authentication** from an **OAuth3 consumer** app (i.e. &lt;&lt;Your App>>, Imgur, Pinterest, BitBucket) to an **OAuth2 or OAuth3 service provider** (i.e. Facebook, Pinterest, Github).

# oauth3.html

framework agnostic utilities for seemless login, logout, user switching, and scope elevation via iframe and popup.

# angular-oauth3.js

Utilities which return appropriate urls and request parameters for various login types.

* `window.ngOauth3`
* Oauth3.implicitGrant(provider_uri, scope, redirect_uri, client_id)
* Oauth3.authorizationCode(provider_uri, scope, redirect_uri, client_id)
* Oauth3.resourceOwnerPassword(provider_uri, scope, username, password, client_id)

Notes

* *client_id* is not required for the implicit grant (browser only) strategy for true oauth3
* The app id is the last parameter because true lientId

OAuth2 Security Concerns:

These are issues that exist in OAuth2 and I need to think about them and consider how OAuth2 addresses them and how OAuth3 can address them.

* iOS: I can steal a client_id from a webapp and then use it in a mobile webview to pose as that app.
* FxOS: I can hijack a redirect for any arbitrary domain: 
