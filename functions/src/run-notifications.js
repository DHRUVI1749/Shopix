"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const {
    sendMonthlyReports,
    sendWarrantyReminders
} = require("./notifications");

const DEFAULT_APP_BASE_URL = "https://shopix-f1fee.web.app";
const DEFAULT_PROJECT_ID = "shopix-f1fee";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";
const VALID_MODES = new Set(["monthly", "warranty", "all"]);

function parseMode(argv) {
    const values = Array.isArray(argv) ? argv : [];
    const modeValue = values.find(function (value) {
        return !String(value).startsWith("-");
    });
    const mode = String(modeValue || "all").trim().toLowerCase();

    if (!VALID_MODES.has(mode)) {
        throw new Error(
            `Unknown notification mode "${mode}". ` +
            "Use monthly, warranty, or all."
        );
    }

    return mode;
}

function resolveDryRun(argv, env) {
    const values = Array.isArray(argv) ? argv.map(String) : [];
    const environment = env || {};
    const envDryRun = String(environment.DRY_RUN || "")
        .trim()
        .toLowerCase();
    const envExecute = String(environment.EXECUTE || "")
        .trim()
        .toLowerCase();

    if (values.includes("--dry-run") || envDryRun === "true") {
        return true;
    }

    if (values.includes("--execute") || envExecute === "true") {
        return false;
    }

    throw new Error(
        "Refusing to run without explicit intent. " +
        "Use --dry-run to inspect or --execute for a real run."
    );
}

function getProjectId(env) {
    return String(
        env.GCP_PROJECT_ID ||
        env.GOOGLE_CLOUD_PROJECT ||
        DEFAULT_PROJECT_ID
    ).trim();
}

function getAppBaseUrl(env) {
    return String(env.APP_BASE_URL || "").trim() || DEFAULT_APP_BASE_URL;
}

function writeLog(level, message, data) {
    const details = data === undefined
        ? ""
        : ` ${JSON.stringify(data)}`;

    if (level === "error") {
        console.error(`${message}${details}`);
        return;
    }

    if (level === "warn") {
        console.warn(`${message}${details}`);
        return;
    }

    console.log(`${message}${details}`);
}

function createLogger() {
    return {
        info: function (message, data) {
            writeLog("info", message, data);
        },
        warn: function (message, data) {
            writeLog("warn", message, data);
        },
        error: function (message, data) {
            writeLog("error", message, data);
        }
    };
}

async function main(argv, env) {
    const args = argv || process.argv.slice(2);
    const environment = env || process.env;
    const mode = parseMode(args);
    const dryRun = resolveDryRun(args, environment);
    const projectId = getProjectId(environment);
    const logger = createLogger();

    initializeApp({ projectId });

    const db = getFirestore();
    const auth = getAuth();

    db.settings({ ignoreUndefinedProperties: true });

    const options = {
        db,
        auth,
        now: new Date(),
        timeZone: DEFAULT_TIME_ZONE,
        appBaseUrl: getAppBaseUrl(environment),
        dryRun,
        logger
    };

    logger.info("Starting scheduled notification run.", {
        mode,
        projectId,
        timeZone: DEFAULT_TIME_ZONE,
        dryRun
    });

    if (mode === "monthly" || mode === "all") {
        const stats = await sendMonthlyReports(options);
        logger.info("Monthly notification run completed.", stats);
    }

    if (mode === "warranty" || mode === "all") {
        const stats = await sendWarrantyReminders(options);
        logger.info("Warranty notification run completed.", stats);
    }
}

if (require.main === module) {
    main().catch(function (error) {
        const message = error && (
            error.stack ||
            error.message ||
            String(error)
        );

        console.error("Scheduled notification run failed.", message);

        if (error && error.stats) {
            console.error("Failed run stats.", JSON.stringify(error.stats));
        }

        process.exitCode = 1;
    });
}

module.exports = {
    createLogger,
    getAppBaseUrl,
    getProjectId,
    main,
    parseMode,
    resolveDryRun
};
