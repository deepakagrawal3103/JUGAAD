import { createApp } from "./app.js";
import { ENV } from "./config/env.js";

const app = createApp();

app.listen(ENV.port, "0.0.0.0", () => {
  console.log(`[ClosetLoop Backend] Listening on port ${ENV.port}`);
});
