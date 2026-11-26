import { createApp } from "./app.js";
import { ENV } from "./config/env.js";

const app = createApp();

app.listen(ENV.port, () => {
  console.log(`[ClosetLoop Backend] Listening on http://localhost:${ENV.port}`);
});
