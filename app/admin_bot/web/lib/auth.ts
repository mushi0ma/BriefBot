/**
 * Telegram initData HMAC-SHA256 validation.
 * Verifies that requests to API routes originate from the Telegram Mini App.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import CryptoJS from "crypto-js";

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface ValidatedInitData {
    user: TelegramUser;
    authDate: number;
    hash: string;
    raw: string;
}

/**
 * Validate Telegram initData using HMAC-SHA256.
 *
 * @param initData - The raw initData query string from Telegram WebApp
 * @returns Parsed user data if valid, null if invalid
 */
export function validateInitData(initData: string): ValidatedInitData | null {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error("[auth] TELEGRAM_BOT_TOKEN not set");
        return null;
    }

    if (!initData || initData.trim() === "") {
        return null;
    }

    try {
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");
        if (!hash) return null;

        // Build data_check_string: sorted key=value pairs, excluding "hash"
        const entries: string[] = [];
        params.forEach((value, key) => {
            if (key !== "hash") {
                entries.push(`${key}=${value}`);
            }
        });
        entries.sort();
        const dataCheckString = entries.join("\n");

        // HMAC-SHA256("WebAppData", bot_token) → secret_key
        const secretKey = CryptoJS.HmacSHA256(botToken, "WebAppData");

        // HMAC-SHA256(secret_key, data_check_string) → computed_hash
        const computedHash = CryptoJS.HmacSHA256(dataCheckString, secretKey).toString(
            CryptoJS.enc.Hex
        );

        if (computedHash !== hash) {
            console.warn("[auth] Hash mismatch");
            return null;
        }

        // Check auth_date isn't too old (10 minutes)
        const authDate = parseInt(params.get("auth_date") ?? "0", 10);
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 600) {
            console.warn("[auth] initData expired", { authDate, now });
            return null;
        }

        // Parse user
        const userStr = params.get("user");
        if (!userStr) return null;

        const user: TelegramUser = JSON.parse(decodeURIComponent(userStr));

        return { user, authDate, hash, raw: initData };
    } catch (err) {
        console.error("[auth] Validation error:", err);
        return null;
    }
}
