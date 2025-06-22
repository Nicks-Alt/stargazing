const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'verified_users.json');

// Load verified users from file
function loadVerifiedUsers() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            const users = JSON.parse(data);
            console.log(`📂 Loaded ${Object.keys(users).length} verified users from storage`);
            return users;
        } else {
            console.log(`📂 Storage file doesn't exist, creating new one`);
        }
    } catch (error) {
        console.error('❌ Error loading verified users:', error);
    }
    return {};
}

// Save verified users to file
function saveVerifiedUsers(users) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(users, null, 2));
        console.log(`✅ Verified users saved to file (${Object.keys(users).length} users)`);
    } catch (error) {
        console.error('❌ Error saving verified users:', error);
    }
}

// Add a verified user
function addVerifiedUser(discordId, steamId, name, rank) {
    console.log(`📝 Adding verified user: ${name} (Discord: ${discordId}, Steam: ${steamId})`);
    const users = loadVerifiedUsers();
    users[discordId] = {
        steamId: steamId,
        name: name,
        rank: rank,
        verifiedAt: new Date().toISOString()
    };
    saveVerifiedUsers(users);
    console.log(`✅ Successfully added verified user: ${name} (${discordId})`);
}

// Get verified user
function getVerifiedUser(discordId) {
    console.log(`🔍 Looking up verified user: ${discordId}`);
    const users = loadVerifiedUsers();
    const user = users[discordId] || null;
    console.log(`🔍 Result for ${discordId}:`, user ? 'FOUND' : 'NOT FOUND');
    return user;
}

// Remove verified user
function removeVerifiedUser(discordId) {
    console.log(`🗑️ Attempting to remove verified user: ${discordId}`);
    const users = loadVerifiedUsers();
    if (users[discordId]) {
        const userData = users[discordId];
        delete users[discordId];
        saveVerifiedUsers(users);
        console.log(`✅ Successfully removed verified user: ${discordId} (${userData.name})`);
        return true;
    } else {
        console.log(`⚠️ User ${discordId} not found in verified users`);
        return false;
    }
}

// Get all verified users
function getAllVerifiedUsers() {
    console.log(`📋 Getting all verified users`);
    const users = loadVerifiedUsers();
    console.log(`📋 Returning ${Object.keys(users).length} verified users`);
    return users;
}

module.exports = {
    addVerifiedUser,
    getVerifiedUser,
    removeVerifiedUser,
    getAllVerifiedUsers
};