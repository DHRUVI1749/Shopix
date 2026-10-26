"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getAppBaseUrl,
    getProjectId,
    parseMode,
    resolveDryRun
} = require("../src/run-notifications");

test("parseMode defaults to all", function () {
    assert.equal(parseMode([]), "all");
});

test("parseMode accepts supported modes case-insensitively", function () {
    assert.equal(parseMode(["monthly"]), "monthly");
    assert.equal(parseMode(["WARRANTY"]), "warranty");
    assert.equal(parseMode([" all "]), "all");
});

test("parseMode ignores leading options", function () {
    assert.equal(parseMode(["--verbose", "warranty"]), "warranty");
});

test("parseMode rejects unknown modes", function () {
    assert.throws(
        function () {
            parseMode(["daily"]);
        },
        /Unknown notification mode "daily"/
    );
});

test("resolveDryRun requires explicit run intent", function () {
    assert.throws(
        function () {
            resolveDryRun([], {});
        },
        /Refusing to run without explicit intent/
    );
});

test("resolveDryRun accepts dry-run flags and environment values", function () {
    assert.equal(resolveDryRun(["--dry-run"], {}), true);
    assert.equal(resolveDryRun([], { DRY_RUN: "true" }), true);
});

test("resolveDryRun accepts execute flags and environment values", function () {
    assert.equal(resolveDryRun(["--execute"], {}), false);
    assert.equal(resolveDryRun([], { EXECUTE: "true" }), false);
});

test("resolveDryRun prefers dry-run when both intents are present", function () {
    assert.equal(
        resolveDryRun(["--execute", "--dry-run"], { DRY_RUN: "false" }),
        true
    );
});

test("getProjectId prefers explicit environment values", function () {
    assert.equal(
        getProjectId({
            GCP_PROJECT_ID: "explicit-project",
            GOOGLE_CLOUD_PROJECT: "fallback-project"
        }),
        "explicit-project"
    );
    assert.equal(
        getProjectId({ GOOGLE_CLOUD_PROJECT: "fallback-project" }),
        "fallback-project"
    );
    assert.equal(getProjectId({}), "shopix-f1fee");
});

test("getAppBaseUrl uses the configured URL or default", function () {
    assert.equal(
        getAppBaseUrl({ APP_BASE_URL: "https://example.test" }),
        "https://example.test"
    );
    assert.equal(getAppBaseUrl({}), "https://shopix-f1fee.web.app");
});
