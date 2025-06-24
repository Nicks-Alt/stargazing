const dgram = require('dgram');
const { ActivityType } = require('discord.js');

class A2SHandler {
    constructor(client) {
        this.client = client;
        this.serverIP = 'rp.superiorservers.co';
        this.serverPort = 27015;
        this.queryInterval = 30 * 1000; // 30 seconds
        this.intervalId = null;
        this.lastPlayerCount = 0;
        this.serverOnline = false;
        this.serverInfo = null;
        this.timeout = 5000; // 5 second timeout
    }

    start() {
        console.log(`🖥️ Starting A2S monitoring for ${this.serverIP}:${this.serverPort}`);
        console.log(`🔄 Querying every ${this.queryInterval / 1000} seconds`);
        
        // Run initial query
        this.queryServer();
        
        // Set up recurring queries
        this.intervalId = setInterval(() => {
            this.queryServer();
        }, this.queryInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ A2S monitoring stopped');
        }
    }

    async queryServer() {
        try {
            console.log(`🔍 Querying server ${this.serverIP}:${this.serverPort}...`);
            
            const serverInfo = await this.a2sInfo();
            
            const playerCount = serverInfo.players || 0;
            const maxPlayers = serverInfo.maxPlayers || 0;
            const serverName = serverInfo.name || 'Unknown Server';
            
            // Store server info
            this.serverInfo = serverInfo;
            
            // Update status if player count changed or server came back online
            if (playerCount !== this.lastPlayerCount || !this.serverOnline) {
                this.lastPlayerCount = playerCount;
                this.serverOnline = true;
                
                await this.updateBotStatus(playerCount, maxPlayers, serverName);
                console.log(`✅ Server online: ${playerCount}/${maxPlayers} players`);
            }
            
        } catch (error) {
            console.error('❌ Failed to query server:', error.message);
            
            // Update status to show server offline if it was previously online
            if (this.serverOnline) {
                this.serverOnline = false;
                this.lastPlayerCount = 0;
                this.serverInfo = null;
                await this.updateBotStatus(0, 0, 'Server Offline');
                console.log('🔴 Server appears to be offline');
            }
        }
    }

    async a2sInfo() {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            let timeoutId;
            
            // A2S_INFO packet
            const packet = Buffer.from([
                0xFF, 0xFF, 0xFF, 0xFF, // Header
                0x54, // A2S_INFO
                ...Buffer.from('Source Engine Query\0', 'ascii') // Payload
            ]);
            
            socket.on('message', (msg, rinfo) => {
                try {
                    clearTimeout(timeoutId);
                    socket.close();
                    
                    const serverInfo = this.parseA2SInfoResponse(msg);
                    resolve(serverInfo);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
            
            socket.on('error', (error) => {
                clearTimeout(timeoutId);
                socket.close();
                reject(new Error(`Socket error: ${error.message}`));
            });
            
            // Set timeout
            timeoutId = setTimeout(() => {
                socket.close();
                reject(new Error('Query timeout'));
            }, this.timeout);
            
            // Send packet
            socket.send(packet, this.serverPort, this.serverIP, (error) => {
                if (error) {
                    clearTimeout(timeoutId);
                    socket.close();
                    reject(new Error(`Send error: ${error.message}`));
                }
            });
        });
    }

    parseA2SInfoResponse(buffer) {
        let offset = 0;
        
        // Check header
        const header = buffer.readUInt32LE(offset);
        offset += 4;
        
        if (header !== 0xFFFFFFFF) {
            throw new Error('Invalid response header');
        }
        
        // Check response type
        const responseType = buffer.readUInt8(offset);
        offset += 1;
        
        if (responseType !== 0x49) { // 'I' for A2S_INFO response
            throw new Error(`Invalid response type: ${responseType}`);
        }
        
        // Parse server info
        const serverInfo = {};
        
        // Protocol version
        serverInfo.protocol = buffer.readUInt8(offset);
        offset += 1;
        
        // Server name
        const nameEnd = buffer.indexOf(0, offset);
        serverInfo.name = buffer.toString('utf8', offset, nameEnd);
        offset = nameEnd + 1;
        
        // Map name
        const mapEnd = buffer.indexOf(0, offset);
        serverInfo.map = buffer.toString('utf8', offset, mapEnd);
        offset = mapEnd + 1;
        
        // Folder name
        const folderEnd = buffer.indexOf(0, offset);
        serverInfo.folder = buffer.toString('utf8', offset, folderEnd);
        offset = folderEnd + 1;
        
        // Game name
        const gameEnd = buffer.indexOf(0, offset);
        serverInfo.game = buffer.toString('utf8', offset, gameEnd);
        offset = gameEnd + 1;
        
        // App ID
        serverInfo.appId = buffer.readUInt16LE(offset);
        offset += 2;
        
        // Players
        serverInfo.players = buffer.readUInt8(offset);
        offset += 1;
        
        // Max players
        serverInfo.maxPlayers = buffer.readUInt8(offset);
        offset += 1;
        
        // Bots
        serverInfo.bots = buffer.readUInt8(offset);
        offset += 1;
        
        // Server type
        serverInfo.serverType = String.fromCharCode(buffer.readUInt8(offset));
        offset += 1;
        
        // Environment
        serverInfo.environment = String.fromCharCode(buffer.readUInt8(offset));
        offset += 1;
        
        // Visibility
        serverInfo.visibility = buffer.readUInt8(offset);
        offset += 1;
        
        // VAC
        serverInfo.vac = buffer.readUInt8(offset);
        offset += 1;
        
        // Version
        const versionEnd = buffer.indexOf(0, offset);
        serverInfo.version = buffer.toString('utf8', offset, versionEnd);
        offset = versionEnd + 1;
        
        // Extra Data Flag (EDF)
        if (offset < buffer.length) {
            const edf = buffer.readUInt8(offset);
            offset += 1;
            
            // Port (if EDF & 0x80)
            if (edf & 0x80) {
                serverInfo.port = buffer.readUInt16LE(offset);
                offset += 2;
            }
            
            // SteamID (if EDF & 0x10)
            if (edf & 0x10) {
                serverInfo.steamId = buffer.readBigUInt64LE(offset);
                offset += 8;
            }
            
            // SourceTV (if EDF & 0x40)
            if (edf & 0x40) {
                serverInfo.sourceTvPort = buffer.readUInt16LE(offset);
                offset += 2;
                
                const sourceTvNameEnd = buffer.indexOf(0, offset);
                serverInfo.sourceTvName = buffer.toString('utf8', offset, sourceTvNameEnd);
                offset = sourceTvNameEnd + 1;
            }
            
            // Keywords (if EDF & 0x20)
            if (edf & 0x20) {
                const keywordsEnd = buffer.indexOf(0, offset);
                serverInfo.keywords = buffer.toString('utf8', offset, keywordsEnd);
                offset = keywordsEnd + 1;
            }
            
            // GameID (if EDF & 0x01)
            if (edf & 0x01) {
                serverInfo.gameId = buffer.readBigUInt64LE(offset);
                offset += 8;
            }
        }
        
        return serverInfo;
    }

    async updateBotStatus(playerCount, maxPlayers, serverName) {
        try {
            let statusText;
            let activityType = ActivityType.Watching;
            
            if (this.serverOnline && maxPlayers > 0) {
                statusText = `${playerCount}/${maxPlayers} players`;
            } else if (this.serverOnline) {
                statusText = `${playerCount} players online`;
            } else {
                statusText = 'Server Offline';
                activityType = ActivityType.Watching;
            }
            
            await this.client.user.setActivity(statusText, { 
                type: activityType,
                name: statusText
            });
            
            console.log(`🎮 Status updated: ${statusText}`);
            
        } catch (error) {
            console.error('❌ Failed to update bot status:', error);
        }
    }

    // Manual query method for commands
    async manualQuery() {
        try {
            console.log(`🔍 Manual server query requested`);
            const serverInfo = await this.a2sInfo();
            return {
                success: true,
                data: serverInfo
            };
        } catch (error) {
            console.error('❌ Manual server query failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get current server status
    getStatus() {
        return {
            online: this.serverOnline,
            playerCount: this.lastPlayerCount,
            serverIP: this.serverIP,
            serverPort: this.serverPort,
            serverInfo: this.serverInfo
        };
    }

    // Update server configuration
    updateConfig(ip, port) {
        this.serverIP = ip;
        this.serverPort = port;
        console.log(`🔧 Server config updated: ${ip}:${port}`);
    }
}

module.exports = A2SHandler;