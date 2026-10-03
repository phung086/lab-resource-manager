import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const base = {
  ...process.env,
  NODE_ENV: "production",
  PORT: "8000",
  DATABASE_URL: "postgresql://lab_user:strong-db-password@127.0.0.1:5432/lab_resources",
  JWT_SECRET: "batch7-jwt-secret-that-is-longer-than-32-characters",
  CORS_ORIGINS: "https://lab.example.edu.vn",
  ADMIN_EMAIL: "admin@lab.example.edu.vn",
  ADMIN_PASSWORD: "Batch7Admin!Passphrase",
  ADMIN_FULL_NAME: "Lab Administrator",
  LOG_FORMAT: "combined",
  METRICS_TOKEN: ""
};

function runConfig(overrides = {}) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "import('./src/config.js')"],
    {
      cwd: process.cwd(),
      env: { ...base, ...overrides },
      encoding: "utf8"
    }
  );
}

function expectPass(name, overrides = {}) {
  const result = runConfig(overrides);
  assert.equal(
    result.status,
    0,
    `${name} should pass, stderr: ${result.stderr || result.stdout}`
  );
}

function expectFail(name, overrides, messagePattern) {
  const result = runConfig(overrides);
  assert.notEqual(result.status, 0, `${name} should fail`);
  assert.match(
    `${result.stderr}\n${result.stdout}`,
    messagePattern,
    `${name} should explain the production configuration failure`
  );
}

expectPass("valid production configuration");

expectFail(
  "placeholder JWT",
  { JWT_SECRET: "replace-with-at-least-32-random-characters" },
  /JWT_SECRET/
);
expectFail(
  "wildcard CORS",
  { CORS_ORIGINS: "*" },
  /CORS_ORIGINS/
);
expectFail(
  "short admin password",
  { ADMIN_PASSWORD: "short-pass" },
  /ADMIN_PASSWORD/
);
expectFail(
  "invalid admin email",
  { ADMIN_EMAIL: "not-an-email" },
  /ADMIN_EMAIL/
);
expectFail(
  "unsupported log format",
  { LOG_FORMAT: "made-up-format" },
  /LOG_FORMAT/
);
expectFail("short metrics credential", { METRICS_TOKEN: "short" }, /METRICS_TOKEN/);
expectFail("whitespace metrics credential", { METRICS_TOKEN: " ".repeat(32) }, /METRICS_TOKEN/);
expectFail("oversized metrics credential", { METRICS_TOKEN: "x".repeat(257) }, /METRICS_TOKEN/);
expectPass("authenticated metrics configured", { METRICS_TOKEN: "verification-only-metrics-credential-2026" });

expectFail(
  "payments enabled without VNPAY merchant configuration",
  { PAYMENTS_ENABLED: "true" },
  /VNPAY_/
);

expectPass("payments enabled with complete VNPAY configuration", {
  PAYMENTS_ENABLED: "true",
  VNPAY_ENABLED: "true",
  VNPAY_TMN_CODE: "PROD0001",
  VNPAY_HASH_SECRET: "production-verification-secret-only",
  VNPAY_PAYMENT_URL: "https://pay.vnpay.vn/vpcpay.html",
  VNPAY_RETURN_URL: "https://lab.example.edu.vn/api/payments/vnpay/return",
  VNPAY_IPN_URL: "https://api.lab.example.edu.vn/api/payments/vnpay/ipn"
});

console.log("Production configuration verification: PASS");
