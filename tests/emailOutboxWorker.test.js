import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const state = {
    email: null,
    shouldFail: false,
    sends: 0,
};

const sequelize = {
    transaction: async (callback) =>
        callback({ LOCK: { UPDATE: "UPDATE" } }),
    literal: (value) => value,
};

const EmailOutbox = {
    update: async () => [0],
    findAll: async () => state.email ? [state.email] : [],
};

const sendBrevoEmail = async () => {
    state.sends++;

    if (state.shouldFail) {
        throw new Error("Erreur Brevo simulée");
    }

    return { messageId: "test-message-id" };
};

mock.module(
    new URL("../src/models/connection.js", import.meta.url).href,
    { exports: { sequelize } },
);

mock.module(
    new URL("../src/models/Email_Outbox.js", import.meta.url).href,
    { exports: { EmailOutbox } },
);

mock.module(
    new URL("../src/services/brevoService.js", import.meta.url).href,
    { exports: { sendBrevoEmail } },
);

let processPendingEmails;

before(async () => {
    ({ processPendingEmails } =
        await import("../src/services/emailOutboxWorker.js"));
});

after(() => {
    mock.restoreAll();
});

function prepareTest(attempts = 0) {
    state.sends = 0;
    state.shouldFail = false;

    state.email = {
        eventKey: "test-event",
        eventType: "COMMANDE_CONFIRMEE",
        recipientEmail: "test@example.com",
        payload: { orderNumber: "CMD-TEST" },
        status: "EN_ATTENTE",
        attempts,
        availableAt: new Date(),
        lockedAt: null,
        sentAt: null,
        lastError: null,
        async save() {},
    };
}

describe("Email Outbox Worker", () => {
    it("marque un email comme ENVOYE après succès", async () => {
        prepareTest();

        await processPendingEmails();

        assert.equal(state.sends, 1);
        assert.equal(state.email.status, "ENVOYE");
        assert.equal(state.email.attempts, 1);
        assert.ok(state.email.sentAt);
        assert.equal(state.email.lockedAt, null);
    });

    it("reprogramme un email après un échec temporaire", async () => {
        prepareTest();
        state.shouldFail = true;

        await processPendingEmails();

        assert.equal(state.sends, 1);
        assert.equal(state.email.status, "EN_ATTENTE");
        assert.equal(state.email.attempts, 1);
        assert.ok(state.email.availableAt > new Date());
        assert.equal(state.email.lockedAt, null);
    });

    it("passe en ECHEC après cinq tentatives", async () => {
        prepareTest(4);
        state.shouldFail = true;

        await processPendingEmails();

        assert.equal(state.sends, 1);
        assert.equal(state.email.status, "ECHEC");
        assert.equal(state.email.attempts, 5);
        assert.equal(state.email.lockedAt, null);
    });
});
