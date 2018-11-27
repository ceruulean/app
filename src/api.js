import SDK, { getPayload } from "@directus/sdk-js/dist/remote.cjs.js";
import store from "./store";

const client = new SDK();

const storedToken = store.state.auth.token;
const storedUrl = store.state.auth.url;
const payload = storedToken ? getPayload(storedToken) : null;

if (payload && storedUrl) {
  const timeDiff = payload.exp.getTime() - Date.now();
  const project = payload.project;

  if (timeDiff > 10000) {
    client.url = storedUrl;
    client.token = storedToken;
    client.env = project;
  } else {
    store.dispatch("clearAuth");
  }
}

client.onAutoRefreshSuccess = function refresh(info) {
  store.dispatch("refresh", info);
};

client.onAutoRefreshError = function logout(error) {
  store.dispatch("logout", error);
};

client.startInterval();

export default client;
