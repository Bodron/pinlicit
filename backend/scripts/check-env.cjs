const { config } = require("dotenv");
const { validateEnvironment } = require("../dist/config/environment");
config({ path: process.env.ENV_FILE || ".env", quiet: true });
try {
  validateEnvironment({ ...process.env, NODE_ENV: "production" });
  console.log(
    "Server environment OK. Stripe: " +
      (process.env.STRIPE_ENABLED === "true"
        ? "sandbox enabled"
        : "disabled; configure Stripe values before enabling"),
  );
} catch (error) {
  console.error("Environment check failed: " + error.message);
  process.exitCode = 1;
}
