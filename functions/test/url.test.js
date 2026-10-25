"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAppUrl } = require("../src/url");

test("app URLs use the configured origin and preserve report queries", function () {
    assert.equal(
        buildAppUrl(
            "https://shopix.example.com",
            "reports.html?monthly=2026-09#monthlyReport"
        ),
        "https://shopix.example.com/reports.html?monthly=2026-09#monthlyReport"
    );
});

test("app URLs normalize missing protocols and leading slashes", function () {
    assert.equal(
        buildAppUrl("shopix.example.com/", "/warranty.html"),
        "https://shopix.example.com/warranty.html"
    );
});

test("app URLs fall back safely", function () {
    assert.equal(buildAppUrl("", ""), "https://shopix-f1fee.web.app/");
});
