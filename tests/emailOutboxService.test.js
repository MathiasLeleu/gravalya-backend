import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const state = {
    calls: [],
    email: null,
    created: true,
};

const EmailOutbox = {
    findOrCreate: async (options) => {
        state.calls.push(options);
        return [state.email, state.created];
    },
};

mock.module(
    new URL("../src/models/Email_Outbox.js", import.meta.url).href,
    { exports: { EmailOutbox } },
);

let enqueueEmail;

before(async () => {
    ({ enqueueEmail } = await import("../src/services/emailOutboxService.js"));
});

after(() => {
    mock.restoreAll();
});

function prepareTest() {
    state.calls = [];
    state.email = { id: 1, eventKey: "commande-confirmee-1" };
    state.created = true;
}

function validEmail(overrides = {}) {
    return {
        eventKey: "commande-confirmee-1",
        orderId: 1,
        eventType: "COMMANDE_CONFIRMEE",
        recipientEmail: "client@example.com",
        payload: { orderNumber: "CMD-TEST" },
        ...overrides,
    };
}

describe("Email Outbox Service", () => {
    it("ajoute un email avec les données attendues", async () => {
        prepareTest();

        const transaction = { id: "test-transaction" };

        const result = await enqueueEmail({
            ...validEmail(),
            transaction,
        });

        assert.equal(result.email, state.email);
        assert.equal(result.created, true);
        assert.equal(state.calls.length, 1);

        assert.deepEqual(state.calls[0].where, {
            eventKey: "commande-confirmee-1",
        });

        assert.equal(state.calls[0].defaults.orderId, 1);
        assert.equal(
            state.calls[0].defaults.eventType,
            "COMMANDE_CONFIRMEE",
        );
        assert.equal(
            state.calls[0].defaults.recipientEmail,
            "client@example.com",
        );
        assert.equal(state.calls[0].defaults.status, "EN_ATTENTE");
        assert.equal(state.calls[0].defaults.attempts, 0);
        assert.deepEqual(
            state.calls[0].defaults.payload,
            { orderNumber: "CMD-TEST" },
        );
        assert.equal(state.calls[0].transaction, transaction);
    });

    it("nettoie les espaces autour de la clé et de l'adresse email", async () => {
        prepareTest();

        await enqueueEmail(
            validEmail({
                eventKey: "  commande-confirmee-1  ",
                recipientEmail: " client@example.com ",
            }),
        );

        assert.equal(
            state.calls[0].where.eventKey,
            "commande-confirmee-1",
        );
        assert.equal(
            state.calls[0].defaults.recipientEmail,
            "client@example.com",
        );
    });

    it("retourne created=false si la clé existe déjà", async () => {
        prepareTest();
        state.created = false;

        const result = await enqueueEmail(validEmail());

        assert.equal(result.created, false);
        assert.equal(result.email, state.email);
    });

    it("refuse une clé d'événement vide", async () => {
        prepareTest();

        await assert.rejects(
            enqueueEmail(validEmail({ eventKey: " " })),
            /clé unique/,
        );

        assert.equal(state.calls.length, 0);
    });

    it("refuse un type d'événement inconnu", async () => {
        prepareTest();

        await assert.rejects(
            enqueueEmail(validEmail({ eventType: "EVENEMENT_INCONNU" })),
            /non autorisé/,
        );

        assert.equal(state.calls.length, 0);
    });

    it("refuse une adresse email invalide", async () => {
        prepareTest();

        await assert.rejects(
            enqueueEmail(validEmail({ recipientEmail: "adresse-invalide" })),
            /invalide/,
        );

        assert.equal(state.calls.length, 0);
    });

    it("refuse un identifiant de commande invalide", async () => {
        prepareTest();

        await assert.rejects(
            enqueueEmail(validEmail({ orderId: 0 })),
            /identifiant de commande/,
        );

        assert.equal(state.calls.length, 0);
    });

    it("refuse un payload qui n'est pas un objet", async () => {
        prepareTest();

        await assert.rejects(
            enqueueEmail(validEmail({ payload: [] })),
            /doit être un objet/,
        );

        assert.equal(state.calls.length, 0);
    });

    it("accepte une notification sans identifiant de commande", async () => {
        prepareTest();

        await enqueueEmail(validEmail({ orderId: null }));

        assert.equal(state.calls[0].defaults.orderId, null);
    });
});