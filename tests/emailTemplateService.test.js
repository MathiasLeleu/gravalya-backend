import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildEmailContent } from "../src/services/emailTemplateService.js";

describe("Email Template Service", () => {
    it("génère le contenu des cinq types d'emails", () => {
        const eventTypes = [
            "COMMANDE_CONFIRMEE",
            "COMMANDE_ANNULEE",
            "COMMANDE_EXPEDIEE",
            "COMMANDE_LIVREE",
            "REMBOURSEMENT_REUSSI",
        ];

        for (const eventType of eventTypes) {
            const result = buildEmailContent(eventType);

            assert.ok(result.subject);
            assert.ok(result.htmlContent);
            assert.ok(result.textContent);
            assert.match(result.htmlContent, /Gravelya Studio/);
        }
    });

    it("affiche un lien de suivi HTTPS valide", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "https://tracking.example.com/parcel/123",
        });

        assert.match(
            result.htmlContent,
            /href="https:\/\/tracking\.example\.com\/parcel\/123"/,
        );

        assert.match(
            result.textContent,
            /Suivi : https:\/\/tracking\.example\.com\/parcel\/123/,
        );
    });

    it("masque un lien de suivi HTTP", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "http://tracking.example.com/parcel/123",
        });

        assert.doesNotMatch(result.htmlContent, /Suivre ma commande/);
        assert.doesNotMatch(result.textContent, /Suivi :/);
    });

    it("masque un protocole javascript", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "javascript:alert(1)",
        });

        assert.doesNotMatch(result.htmlContent, /Suivre ma commande/);
        assert.doesNotMatch(result.textContent, /Suivi :/);
    });

    it("masque un protocole data", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "data:text/html,test",
        });

        assert.doesNotMatch(result.htmlContent, /Suivre ma commande/);
        assert.doesNotMatch(result.textContent, /Suivi :/);
    });

    it("masque une URL malformée", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "ceci-n-est-pas-une-url",
        });

        assert.doesNotMatch(result.htmlContent, /Suivre ma commande/);
        assert.doesNotMatch(result.textContent, /Suivi :/);
    });

    it("échappe les données personnelles injectées dans le HTML", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            customerName: '<script>alert("test")</script>',
            orderNumber: "<CMD-TEST>",
            trackingNumber: "<TRACKING>",
        });

        assert.doesNotMatch(result.htmlContent, /<script>/);
        assert.match(result.htmlContent, /&lt;script&gt;/);
        assert.match(result.htmlContent, /&lt;CMD-TEST&gt;/);
        assert.match(result.htmlContent, /&lt;TRACKING&gt;/);
    });

    it("refuse un type d'email inconnu", () => {
        assert.throws(
            () => buildEmailContent("TYPE_INCONNU"),
            /Type d'email non pris en charge/,
        );
    });

    it("refuse une URL HTTPS contenant des identifiants", () => {
    const result = buildEmailContent("COMMANDE_EXPEDIEE", {
        trackingUrl: "https://user:password@tracking.example.com/parcel/123",
    });

    assert.doesNotMatch(result.htmlContent, /Suivre ma commande/);
    assert.doesNotMatch(result.textContent, /Suivi :/);
    });

    it("préserve les paramètres d'une URL dans le texte et les échappe dans le HTML", () => {
        const result = buildEmailContent("COMMANDE_EXPEDIEE", {
            trackingUrl: "https://tracking.example.com/parcel/123?lang=fr&source=email",
        });

        assert.match(
            result.htmlContent,
            /href="https:\/\/tracking\.example\.com\/parcel\/123\?lang=fr&amp;source=email"/,
        );

        assert.match(
            result.textContent,
            /Suivi : https:\/\/tracking\.example\.com\/parcel\/123\?lang=fr&source=email/,
        );
    });
});