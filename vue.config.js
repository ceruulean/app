/* global module, process */
module.exports = {
  pwa: {
    name: "Directus",
    themeColor: "#263238",
    msTileColor: "#263238",
    appleMobileWebAppCapable: "yes",
    appleMobileWebAppStatusBarStyle: "black"
  },
  publicPath: process.env.NODE_ENV === "production" ? "" : "/"
};
