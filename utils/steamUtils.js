function convertSteamId(steamId) {
    console.log(`📝 Processing Steam ID: ${steamId}`);
    
    let steam64 = steamId;
    
    if (steamId.startsWith('STEAM_')) {
        console.log('🔄 Converting STEAM_ format to Steam64...');
        const match = steamId.match(/^STEAM_[0-5]:([01]):(\d+)$/);
        if (match) {
            const authServer = parseInt(match[1]);
            const authId = parseInt(match[2]);
            steam64 = (BigInt(76561197960265728) + BigInt(authId * 2) + BigInt(authServer)).toString();
            console.log(`✅ Converted to Steam64: ${steam64}`);
        } else {
            console.log('❌ Invalid STEAM_ format');
            return null;
        }
    } else {
        console.log('📋 Using provided Steam64 ID');
    }
    
    return steam64;
}

module.exports = { convertSteamId };