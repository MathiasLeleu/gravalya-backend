import { EmailOutbox } from "../models/Email_Outbox.js";

const EMAIL_EVENT_TYPES = [
    "COMMANDE_CONFIRMEE",
    "COMMANDE_ANNULEE",
    "COMMANDE_EXPEDIEE",
    "COMMANDE_LIVREE",
    "REMBOURSEMENT_REUSSI",
];

export async function enqueueEmail({
    eventKey,
    orderId = null,
    eventType,
    recipientEmail,
    payload = {},
    transaction = null,
}) {
    if (typeof eventKey !== "string" || !eventKey.trim()) {
        throw new Error("La clé unique de l'événement email est obligatoire.");
    }

    if (!EMAIL_EVENT_TYPES.includes(eventType)) {
        throw new Error(`Type d'événement email non autorisé : ${eventType}`);
    }

    if (
        typeof recipientEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())
    ) {
        throw new Error("L'adresse email du destinataire est invalide.");
    }

    if (
        orderId !== null &&
        (!Number.isInteger(orderId) || orderId <= 0)
    ) {
        throw new Error("L'identifiant de commande est invalide.");
    }

    if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {
        throw new Error("Le contenu de l'événement email doit être un objet.");
    }

    const [email, created] = await EmailOutbox.findOrCreate({
        where: {
            eventKey: eventKey.trim(),
        },
        defaults: {
            orderId,
            eventType,
            recipientEmail: recipientEmail.trim(),
            payload,
            status: "EN_ATTENTE",
            attempts: 0,
            availableAt: new Date(),
        },
        transaction,
    });

    return {
        email,
        created,
    };
}