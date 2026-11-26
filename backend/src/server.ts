import { createApp } from "./app.js";
import { ENV } from "./config/env.js";

const app = createApp();

app.listen(ENV.port, "0.0.0.0", () => {
  console.log(`[RentKro Backend] Listening on port ${ENV.port}`);
});
