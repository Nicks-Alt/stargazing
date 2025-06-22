/**
 * Utility functions for Steam ID conversion
 */

/**
 * Convert STEAM_ format to Steam64
 * @param {string} steamId - Steam ID in STEAM_ format
 * @returns {string|null} - Steam64 ID or null if invalid
 */
function steamToSteam64(steamId) {
    const match = steamId.match(/^STEAM_[0-5]:([01]):(\d+)$/);
    if (!match) return null;
    
    const authServer = parseInt(match[1]);
    const authId = parseInt(match[2]);
    
    const steam64 = BigInt(76561197960265728) + BigInt(authId * 2) + BigInt(authServer);
    return steam64.toString();
}

/**
 * Convert Steam64 to STEAM_ format
 * @param {string} steam64 - Steam64 ID
 * @returns {string|null} - STEAM_ format or null if invalid
 */
function steam64ToSteam(steam64) {
    if (!/^7656119\d{10}$/.test(steam64)) return null;
    
    const steamId64 = BigInt(steam64);
    const base = BigInt(76561197960265728);
    
    if (steamId64 < base) return null;
    
    const accountId = steamId64 - base;
    const authServer = accountId % BigInt(2);
    const authId = (accountId - authServer) / BigInt(2);
    
    return `STEAM_0:${authServer}:${authId}`;
}

/**
 * Validate and normalize Steam ID to Steam64 format
 * @param {string} steamId - Steam ID in any format
 * @returns {string|null} - Steam64 ID or null if invalid
 */
function normalizeToSteam64(steamId) {
    // Already Steam64
    if (/^7656119\d{10}$/.test(steamId)) {
        return steamId;
    }
    
    // STEAM_ format
    if (steamId.startsWith('STEAM_')) {
        return steamToSteam64(steamId);
    }
    
    return null;
}

module.exports = {
    steamToSteam64,
    steam64ToSteam,
    normalizeToSteam64
};