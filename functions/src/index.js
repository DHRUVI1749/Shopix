"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const {
    sendMonthlyReports,
    sendWarrantyReminders
} = require("./notifications");

initializeApp();

const db = getFirestore();
const auth = getAuth();

db.settings({ ignoreUndefinedProperties: true });

const appBaseUrl = defineString("APP_BASE_URL", {
    description: "Public URL of the SHOPIX web app",
    default: "https://shopix-f1fee.web.app"
});

const REGION = "asia-south1";
const TIME_ZONE = "Asia/Kolkata";

exports.sendMonthlyExpenseReports = onSchedule(
    {
        schedule: "0 9 1 * *",
        timeZone: TIME_ZONE,
        region: REGION,
        retryCount: 3,
        timeoutSeconds: 540,
        memory: "256MiB"
    },
    async function () {
        return sendMonthlyReports({
            db,
            auth,
            now: new Date(),
            timeZone: TIME_ZONE,
            appBaseUrl: appBaseUrl.value(),
            logger
        });
    }
);

exports.sendWarrantyReminders = onSchedule(
    {
        schedule: "0 9 * * *",
        timeZone: TIME_ZONE,
        region: REGION,
        retryCount: 3,
        timeoutSeconds: 540,
        memory: "256MiB"
    },
    async function () {
        return sendWarrantyReminders({
            db,
            auth,
            now: new Date(),
            timeZone: TIME_ZONE,
            appBaseUrl: appBaseUrl.value(),
            logger
        });
    }
);
