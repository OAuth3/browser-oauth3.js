'use strict';

angular
  .module('oauth3', [])
  .service('Oauth3', [
    '$timeout'
  , '$q'
  , '$http'
  , function Oauth3($timeout, $q, $http) {

    var oauth3 = window.OAUTH3;

    // We need to make angular's $q appear to be a standard Promise/A+
    // fortunately, this is pretty easy
    function PromiseAngularQ(fn) {
      var d = $q.defer();

      $timeout(function () {
        fn(d.resolve, d.reject);
      }, 0);

      //this.then = d.promise.then;
      //this.catch = d.promise.catch;
      return d.promise;
    }

    //PromiseAngularQ.create = PromiseAngularQ;
    PromiseAngularQ.resolve = $q.when;
    PromiseAngularQ.reject = $q.reject;
    PromiseAngularQ.all = $q.all;

    oauth3.providePromise(PromiseAngularQ).then(function () {
      // ignore
    }, function (/*err*/) {
      console.error("Bad Promise Implementation!");
    });

    oauth3.provideRequest($http);

    window.ngOauth3 = oauth3;

    return oauth3;
  }]);
