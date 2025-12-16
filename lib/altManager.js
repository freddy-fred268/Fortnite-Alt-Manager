// Persistent alt manager using JSON file
const fs = require('fs');
const path = require('path');
const ALTS_PATH = path.join(__dirname, '../data/alts.json');

function loadAlts() {
    try {
        if (fs.existsSync(ALTS_PATH)) {
            return JSON.parse(fs.readFileSync(ALTS_PATH, 'utf8'));
        }
    } catch (e) {}
    return [];
}
function saveAlts(alts) {
    fs.mkdirSync(path.dirname(ALTS_PATH), { recursive: true });
    fs.writeFileSync(ALTS_PATH, JSON.stringify(alts, null, 2));
}

let alts = loadAlts();
const statusEmojis = {
    online: '🟢',
    idle: '🟡',
    offline: '⚪',
    banned: '🔴'
};

function addAlt(name) {
    if (alts.find(a => a.name === name)) return false;
    alts.push({ name, status: 'offline' });
    saveAlts(alts);
    return true;
}

function removeAlt(name) {
    if (name === 'all') {
        alts = [];
        saveAlts(alts);
        return true;
    }
    const idx = alts.findIndex(a => a.name === name);
    if (idx !== -1) {
        alts.splice(idx, 1);
        saveAlts(alts);
        return true;
    }
    return false;
}

function setAltStatus(name, status) {
    const alt = alts.find(a => a.name === name);
    if (alt) {
        alt.status = status;
        saveAlts(alts);
        return true;
    }
    return false;
}

function setAllStatus(status) {
    alts.forEach(a => a.status = status);
    saveAlts(alts);
}

module.exports = { get alts() { return alts; }, statusEmojis, addAlt, removeAlt, setAltStatus, setAllStatus };