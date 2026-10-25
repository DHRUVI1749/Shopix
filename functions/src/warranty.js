"use strict";

const { daysBetweenDateKeys } = require("./dates");

const REMINDER_DAYS = Object.freeze([30, 7, 1]);

function getReminderStage(expiryDateKey, todayDateKey) {
    if (!expiryDateKey || !todayDateKey) {
        return null;
    }

    const daysLeft = daysBetweenDateKeys(todayDateKey, expiryDateKey);

    if (daysLeft === null) {
        return null;
    }

    return REMINDER_DAYS.includes(daysLeft) ? daysLeft : null;
}

function getReminderLabel(stage) {
    if (stage === 1) {
        return "tomorrow";
    }

    return `in ${stage} days`;
}

function buildMonthlyNotificationId(periodKey) {
    return `monthly_report_${periodKey}`;
}

function buildWarrantyNotificationId(
    warrantyId,
    expiryDateKey,
    stage
) {
    return `warranty_${warrantyId}_${expiryDateKey}_${stage}`;
}

module.exports = {
    REMINDER_DAYS,
    buildMonthlyNotificationId,
    buildWarrantyNotificationId,
    getReminderLabel,
    getReminderStage
};
