// QalamData runtime config.
// Set aiEndpoint to the on-premise Sovereign AI node (local or Cloudflare tunnel).
// Leave blank to use the in-browser fallback analyst.
// Priority: ?ai= URL param  >  Settings (localStorage)  >  this value  >  http://127.0.0.1:8077
window.QALAM_CONFIG = {
  aiEndpoint: "https://tightknit-nonmiraculous-cinda.ngrok-free.dev"
};
