// GitHub Pages serves 404.html for unknown client routes. That page encodes the
// intended URL as `?p=...`; restore it before React Router reads location.
//
// This must remain an external same-origin file. `index.html` deliberately has
// `script-src 'self'` without `unsafe-inline`, so an inline decoder would be
// blocked before the application could boot.
void (function recoverRoute(location) {
  if (!location.search || location.search[1] !== "p") return;

  var parameters = location.search.slice(1).split("&");
  var encodedPath = parameters.find(function (parameter) {
    return parameter.slice(0, 2) === "p=";
  });
  if (!encodedPath) return;

  var encodedQuery = parameters.find(function (parameter) {
    return parameter.slice(0, 2) === "q=";
  });
  var path = encodedPath.slice(2);
  var query = encodedQuery ? "?" + encodedQuery.slice(2).replace(/~and~/g, "&") : "";

  var basePath = location.pathname.endsWith("/") ? location.pathname : location.pathname + "/";
  window.history.replaceState(null, "", basePath + path + query + location.hash);
}(window.location));
