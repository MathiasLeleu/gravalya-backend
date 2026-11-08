const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[char]);

const EMAIL_TEMPLATES = {
    COMMANDE_CONFIRMEE: {
        subject: "Votre commande est confirmée !",
        title: "Commande confirmée",
        message: "Votre commande a bien été confirmée par notre équipe.",
    },
    COMMANDE_ANNULEE: {
        subject: "Votre commande a été annulée",
        title: "Commande annulée",
        message: "Votre commande a été annulée. Nous restons à votre disposition si vous avez des questions.",
    },
    COMMANDE_EXPEDIEE: {
        subject: "Votre commande est expédiée !",
        title: "Votre création est en route",
        message: "Votre commande a été expédiée. Vous pouvez suivre son acheminement grâce aux informations ci-dessous.",
    },
    COMMANDE_LIVREE: {
        subject: "Votre commande a été livrée",
        title: "Commande livrée",
        message: "Votre commande a été indiquée comme livrée. Nous espérons que votre création vous plaira !",
    },
    REMBOURSEMENT_REUSSI: {
        subject: "Votre remboursement a été effectué",
        title: "Remboursement effectué",
        message: "Le remboursement de votre commande a bien été confirmé.",
    },
};

export function buildEmailContent(eventType, payload = {}) {
    const template = EMAIL_TEMPLATES[eventType];

    if (!template) {
        throw new Error(`Type d'email non pris en charge : ${eventType}`);
    }

    const orderNumber = escapeHtml(payload.orderNumber || "");
    const customerName = escapeHtml(payload.customerName || "");
    const trackingNumber = escapeHtml(payload.trackingNumber || "");
    const trackingUrl = payload.trackingUrl
        ? escapeHtml(payload.trackingUrl)
        : "";

    const details = [
        customerName ? `<p>Bonjour ${customerName},</p>` : "<p>Bonjour,</p>",
        `<p>${template.message}</p>`,
        orderNumber ? `<p><strong>Commande :</strong> ${orderNumber}</p>` : "",
        trackingNumber
            ? `<p><strong>Numéro de suivi :</strong> ${trackingNumber}</p>`
            : "",
        trackingUrl
            ? `<p><a href="${trackingUrl}">Suivre ma commande</a></p>`
            : "",
    ].filter(Boolean).join("\n");

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title}</title>
</head>
<body style="margin:0;padding:30px 15px;background:#f4ebe4;font-family:Arial,sans-serif;color:#493b35;">
    <div style="max-width:600px;margin:0 auto;padding:35px;background:#ffffff;border-radius:8px;">
        <h1 style="font-size:24px;text-align:center;color:#493b35;">Gravelya Studio</h1>
        <h2 style="font-size:20px;color:#493b35;">${template.title}</h2>
        ${details}
        <p style="margin-top:35px;">À bientôt,<br><strong>L'équipe Gravelya Studio</strong></p>
    </div>
</body>
</html>`;

    const textContent = [
        customerName ? `Bonjour ${customerName},` : "Bonjour,",
        "",
        template.message,
        orderNumber ? `Commande : ${orderNumber}` : "",
        trackingNumber ? `Numéro de suivi : ${trackingNumber}` : "",
        trackingUrl ? `Suivi : ${trackingUrl}` : "",
        "",
        "À bientôt,",
        "L'équipe Gravelya Studio",
    ].filter((line) => line !== undefined).join("\n");

    return {
        subject: template.subject,
        htmlContent,
        textContent,
    };
}