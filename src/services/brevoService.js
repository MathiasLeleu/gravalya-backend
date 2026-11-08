const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getBrevoConfig() {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    if (!apiKey || !senderEmail || !senderName) {
        throw new Error(
            "Configuration Brevo incomplète. Vérifiez BREVO_API_KEY, BREVO_SENDER_EMAIL et BREVO_SENDER_NAME."
        );
    }

    return { apiKey, senderEmail, senderName };
}

export async function sendBrevoEmail({
    to,
    subject,
    htmlContent,
    textContent,
}) {
    const { apiKey, senderEmail, senderName } = getBrevoConfig();

    if (typeof to !== "string" || !to.trim()) {
        throw new Error("Le destinataire de l'email est invalide.");
    }

    if (typeof subject !== "string" || !subject.trim()) {
        throw new Error("Le sujet de l'email est invalide.");
    }

    if (
        (typeof htmlContent !== "string" || !htmlContent.trim()) &&
        (typeof textContent !== "string" || !textContent.trim())
    ) {
        throw new Error("Le contenu de l'email est vide.");
    }

    const payload = {
        sender: {
            name: senderName,
            email: senderEmail,
        },
        to: [{ email: to.trim() }],
        subject: subject.trim(),
    };

    if (htmlContent) payload.htmlContent = htmlContent;
    if (textContent) payload.textContent = textContent;

    let response;

    try {
        response = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                accept: "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });
    } catch (error) {
        throw new Error(`Impossible de contacter Brevo : ${error.message}`);
    }

    const responseText = await response.text();

    let responseData = {};

    if (responseText) {
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { message: responseText };
        }
    }

    if (!response.ok) {
        const details =
            responseData.message ||
            responseData.code ||
            `HTTP ${response.status}`;

        const error = new Error(`Brevo a refusé l'envoi : ${details}`);
        error.status = response.status;
        error.brevoResponse = responseData;

        throw error;
    }

    return {
        messageId: responseData.messageId || null,
        response: responseData,
    };
}