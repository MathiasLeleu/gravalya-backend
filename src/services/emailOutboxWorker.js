import { Op } from "sequelize";
import { sequelize } from "../models/connection.js";
import { EmailOutbox } from "../models/Email_Outbox.js";
import { sendBrevoEmail } from "./brevoService.js";
import { buildEmailContent } from "./emailTemplateService.js";

const BATCH_SIZE = 10;
const INTERVAL_MS = 60_000;
const MAX_ATTEMPTS = 5;
const LOCK_TIMEOUT_MS = 10 * 60_000;

let workerRunning = false;

async function processEmail(email) {
    let content;

    try {
        content = buildEmailContent(
            email.eventType,
            email.payload || {}
        );

        await sendBrevoEmail({
            to: email.recipientEmail,
            ...content,
        });
    } catch (error) {
        const delayMinutes = Math.min(
            60,
            2 ** Math.max(0, email.attempts - 1)
        );

        email.status =
            email.attempts >= MAX_ATTEMPTS ? "ECHEC" : "EN_ATTENTE";

        email.availableAt = new Date(
            Date.now() + delayMinutes * 60_000
        );

        email.lockedAt = null;
        email.lastError = String(error.message || error).slice(0, 5000);

        await email.save();

        console.error(`Échec email ${email.eventKey} : ${email.lastError}`);
        return;
    }

    try {
        email.status = "ENVOYE";
        email.sentAt = new Date();
        email.lockedAt = null;
        email.lastError = null;

        await email.save();

        console.log(`Email ${email.eventKey} envoyé via Brevo.`);
    } catch (error) {
        console.error(
            `Email envoyé par Brevo, mais mise à jour Outbox impossible (${email.eventKey}) :`,
            error
        );
    }
}

export async function processPendingEmails() {
    if (workerRunning) return;

    workerRunning = true;

    try {
        const emails = await sequelize.transaction(async (t) => {
            const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);

            // Récupération des emails bloqués par un arrêt du serveur.
            await EmailOutbox.update(
                {
                    status: sequelize.literal(
                        `CASE WHEN attempts >= ${MAX_ATTEMPTS}
                        THEN 'ECHEC' ELSE 'EN_ATTENTE' END`
                    ),
                    lockedAt: null,
                    lastError: sequelize.literal(
                        `CASE WHEN attempts >= ${MAX_ATTEMPTS}
                        THEN 'Nombre maximum de tentatives atteint après interruption du worker.'
                        ELSE last_error END`
                    ),
                },
                {
                    where: {
                        status: "EN_COURS",
                        lockedAt: { [Op.lte]: staleBefore },
                    },
                    transaction: t,
                }
            );

            const pendingEmails = await EmailOutbox.findAll({
                where: {
                    status: "EN_ATTENTE",
                    availableAt: { [Op.lte]: new Date() },
                },
                order: [["created_at", "ASC"]],
                limit: BATCH_SIZE,
                transaction: t,
                lock: t.LOCK.UPDATE,
                skipLocked: true,
            });

            for (const email of pendingEmails) {
                email.status = "EN_COURS";
                email.lockedAt = new Date();
                email.attempts += 1;
                await email.save({ transaction: t });
            }

            return pendingEmails;
        });

        for (const email of emails) {
            await processEmail(email);
        }
    } catch (error) {
        console.error(
            "Erreur du worker email :",
            error
        );
    } finally {
        workerRunning = false;
    }
}

export function startEmailOutboxWorker() {
    console.log("Worker Outbox email démarré.");

    processPendingEmails();

    const interval = setInterval(
        processPendingEmails,
        INTERVAL_MS
    );

    interval.unref?.();

    return interval;
}