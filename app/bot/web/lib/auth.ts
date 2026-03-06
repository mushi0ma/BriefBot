import crypto from "crypto";

export interface ValidatedUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

/**
 * Validate Telegram initData using HMAC-SHA256.
 * Returns the parsed user object, or null if validation fails.
 */
export function validateInitData(
    initData: string,
    botToken: string
): ValidatedUser | null {
    if (!initData || !botToken) return null;

    try {
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");
        if (!hash) return null;

        // Check auth_date freshness (10 min window)
        const authDate = parseInt(params.get("auth_date") ?? "0", 10);
        if (Date.now() / 1000 - authDate > 600) return null;

        // Build the data-check-string
        params.delete("hash");
        const entries = Array.from(params.entries()).sort(([a], [b]) =>
            a.localeCompare(b)
        );
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

        // HMAC-SHA256 validation
        const secretKey = crypto
            .createHmac("sha256", "WebAppData")
            .update(botToken)
            .digest();
        const checkHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        if (checkHash !== hash) return null;

        // Extract user
        const userStr = params.get("user");
        if (!userStr) return null;
        return JSON.parse(userStr) as ValidatedUser;
    } catch {
        return null;
    }
}
