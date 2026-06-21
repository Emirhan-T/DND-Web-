/* =========================================================
   hexUtils.js — Pure helpers for the hex-grid tactical map
   No React here. Used by HexMapBoard.jsx + both dashboards.

   Coordinate system: AXIAL (q, r), pointy-top hexes.
   Data shape mirrors howto/hexgrid/json.txt exactly.
   ========================================================= */

// Historic canvas center (the old map placed everything around 2000,2000
// inside the 4000x4000 .canvas-transform-group). We keep that so pan/zoom feels the same.
export const CANVAS_CENTER = 2000;

// ---------------------------------------------------------
// TERRAIN
// ---------------------------------------------------------
export const TERRAINS = {
    grass:  { label: 'Grass',  color: '#4a7c3a', walkable: true,  movementCost: 1 },
    stone:  { label: 'Stone',  color: '#8a8a8a', walkable: true,  movementCost: 1 },
    water:  { label: 'Water',  color: '#2f6db0', walkable: false, movementCost: 2 },
    mud:    { label: 'Mud',    color: '#6b4f2a', walkable: true,  movementCost: 2 },
    road:   { label: 'Road',   color: '#b89b6a', walkable: true,  movementCost: 1 },
    wall:   { label: 'Wall',   color: '#3a3a3a', walkable: false, movementCost: 99 },
    lava:   { label: 'Lava',   color: '#d24a2a', walkable: false, movementCost: 99 },
    bridge: { label: 'Bridge', color: '#9a6b3f', walkable: true,  movementCost: 1 },
};
export const TERRAIN_LIST = Object.keys(TERRAINS);
export const DEFAULT_TERRAIN = 'grass';

// ---------------------------------------------------------
// OBJECTS (movable / immovable / pickable) — howto/hexgrid/objects.txt
// ---------------------------------------------------------
export const OBJECT_CATALOG = {
    // Movable
    barrel: { category: 'movable',   movable: true,  pickable: false, blocksMovement: true,  icon: '🛢️' },
    crate:  { category: 'movable',   movable: true,  pickable: false, blocksMovement: true,  icon: '📦' },
    cart:   { category: 'movable',   movable: true,  pickable: false, blocksMovement: true,  icon: '🛒' },
    chest:  { category: 'movable',   movable: true,  pickable: false, blocksMovement: true,  icon: '🧰', container: true },
    // Immovable
    tree:   { category: 'immovable', movable: false, pickable: false, blocksMovement: true,  icon: '🌲' },
    wall:   { category: 'immovable', movable: false, pickable: false, blocksMovement: true,  icon: '🧱' },
    rock:   { category: 'immovable', movable: false, pickable: false, blocksMovement: true,  icon: '🪨' },
    door:   { category: 'immovable', movable: false, pickable: false, blocksMovement: true,  icon: '🚪' },
    // Pickable
    potion:       { category: 'pickable', movable: true, pickable: true, blocksMovement: false, icon: '🧪' },
    key:          { category: 'pickable', movable: true, pickable: true, blocksMovement: false, icon: '🗝️' },
    scroll:       { category: 'pickable', movable: true, pickable: true, blocksMovement: false, icon: '📜' },
    weapon:       { category: 'pickable', movable: true, pickable: true, blocksMovement: false, icon: '⚔️' },
    'coin pouch': { category: 'pickable', movable: true, pickable: true, blocksMovement: false, icon: '💰' },
};
export const OBJECT_LIST = Object.keys(OBJECT_CATALOG);

export const TOKEN_TYPES = ['pc', 'npc', 'monster'];

// ---------------------------------------------------------
// AXIAL <-> PIXEL MATH (pointy-top)
// ---------------------------------------------------------
const SQRT3 = Math.sqrt(3);

export const axialKey = (q, r) => `${q},${r}`;

export function axialToPixel(q, r, size) {
    const x = size * SQRT3 * (q + r / 2);
    const y = size * 1.5 * r;
    return { x, y };
}

export function hexRound(qf, rf) {
    // cube coords
    let x = qf;
    let z = rf;
    let y = -x - z;
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);
    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return { q: rx, r: rz };
}

export function pixelToAxial(x, y, size) {
    const qf = (SQRT3 / 3 * x - 1 / 3 * y) / size;
    const rf = (2 / 3 * y) / size;
    return hexRound(qf, rf);
}

export function hexDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// 6 corner points "x,y x,y ..." for an SVG <polygon> (pointy-top -> -30deg offset)
export function hexPolygonPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30);
        pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
}

// Rectangular hex layout (offset coords -> axial) so the board is a proper RECTANGLE,
// not a slanted rhombus. Pointy-top, "odd/even-r" offset: row r, col col -> q = col - floor(r/2).
export function rectHexes(width, height) {
    const cells = [];
    for (let row = 0; row < height; row++) {
        const off = Math.floor(row / 2);
        for (let col = 0; col < width; col++) cells.push({ q: col - off, r: row });
    }
    return cells;
}

// Pixel bounds of the rectangular hex map
function mapBounds(width, height, size) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rectHexes(width, height).forEach(({ q, r }) => {
        const { x, y } = axialToPixel(q, r, size);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    const padX = size * SQRT3 / 2, padY = size;
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

// Offset that centers the map's bounding box on CANVAS_CENTER (so it sits where the old map did)
export function getRenderOrigin(width, height, size, center = CANVAS_CENTER) {
    const b = mapBounds(width, height, size);
    return {
        ox: center - (b.minX + b.maxX) / 2,
        oy: center - (b.minY + b.maxY) / 2,
    };
}

// Center pixel of a hex, including the render origin
export function hexCenter(q, r, size, origin) {
    const p = axialToPixel(q, r, size);
    return { x: p.x + origin.ox, y: p.y + origin.oy };
}

// Pixel rectangle covering the whole map (for the background image), centered on CANVAS_CENTER.
export function mapPixelRect(width, height, size) {
    const origin = getRenderOrigin(width, height, size);
    const b = mapBounds(width, height, size);
    return { left: b.minX + origin.ox, top: b.minY + origin.oy, width: b.maxX - b.minX, height: b.maxY - b.minY };
}

// ---------------------------------------------------------
// OBJECTS / TOKENS factories
// ---------------------------------------------------------
let _idSeq = 0;
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${(_idSeq++).toString(36)}`;

export function makeObject(type, q, r) {
    const def = OBJECT_CATALOG[type] || OBJECT_CATALOG.crate;
    return {
        id: uid('obj'),
        type,
        name: type,
        q, r,
        movable: def.movable,
        pickable: def.pickable,
        blocksMovement: def.blocksMovement,
        visibleToPlayers: true,
        contains: def.container ? [] : null,
    };
}

// First empty hex (no token / no object); falls back to map center.
export function nextFreeHex(tokens = [], objects = [], width = 12, height = 12) {
    const taken = new Set([
        ...tokens.map(t => axialKey(t.q, t.r)),
        ...objects.map(o => axialKey(o.q, o.r)),
    ]);
    for (const { q, r } of rectHexes(width, height)) {
        if (!taken.has(axialKey(q, r))) return { q, r };
    }
    return { q: 0, r: 0 };
}

// ---------------------------------------------------------
// MAP (de)serialization — howto/hexgrid/json.txt shape
// ---------------------------------------------------------
export const DEFAULT_HEX_CONFIG = { size: 34, visible: true, opacity: 1 };

// Build a blank rhombus map (all grass, walkable, visible) as the howto JSON shape.
export function createBlankMap({ campaignId = null, mapName = 'New Map', width = 12, height = 12 } = {}) {
    const hexes = rectHexes(width, height).map(({ q, r }) => ({
        q, r,
        terrain: DEFAULT_TERRAIN,
        walkable: TERRAINS[DEFAULT_TERRAIN].walkable,
        movementCost: TERRAINS[DEFAULT_TERRAIN].movementCost,
        visibleToPlayers: true,
    }));
    return {
        campaignId, mapName, width, height,
        hexes, objects: [], tokens: [],
        gmNotes: '', playerDescription: '',
        backgroundImageUrl: null,
        hexConfig: { ...DEFAULT_HEX_CONFIG },
    };
}

// JSON (array hexes) -> live state pieces used by the dashboards/board.
export function applyMapJson(json = {}) {
    const hexes = {};
    (json.hexes || []).forEach(h => {
        hexes[axialKey(h.q, h.r)] = {
            terrain: h.terrain || DEFAULT_TERRAIN,
            walkable: h.walkable !== undefined ? h.walkable : (TERRAINS[h.terrain]?.walkable ?? true),
            movementCost: h.movementCost ?? (TERRAINS[h.terrain]?.movementCost ?? 1),
            visibleToPlayers: h.visibleToPlayers !== false,
        };
    });
    return {
        hexes,
        mapObjects: (json.objects || []).map(o => ({ ...o, visibleToPlayers: o.visibleToPlayers !== false })),
        tokens: (json.tokens || []).map(t => ({
            ...t,
            q: t.q ?? 0,
            r: t.r ?? 0,
            visibleToPlayers: t.visibleToPlayers !== false,
            // keep combat/back-compat field in sync
            isHidden: t.visibleToPlayers === false,
        })),
        mapMeta: {
            campaignId: json.campaignId ?? null,
            mapName: json.mapName ?? 'New Map',
            width: json.width ?? 12,
            height: json.height ?? 12,
            gmNotes: json.gmNotes ?? '',
            playerDescription: json.playerDescription ?? '',
        },
        backgroundImageUrl: json.backgroundImageUrl ?? null,
        hexConfig: { ...DEFAULT_HEX_CONFIG, ...(json.hexConfig || {}) },
    };
}

// Live state pieces -> JSON (array hexes). Inverse of applyMapJson.
export function buildMapJson({ hexes = {}, mapObjects = [], tokens = [], mapMeta = {}, backgroundImageUrl = null, hexConfig = DEFAULT_HEX_CONFIG }) {
    const hexArr = Object.entries(hexes).map(([key, h]) => {
        const [q, r] = key.split(',').map(Number);
        return {
            q, r,
            terrain: h.terrain,
            walkable: h.walkable,
            movementCost: h.movementCost,
            visibleToPlayers: h.visibleToPlayers !== false,
        };
    });
    return {
        campaignId: mapMeta.campaignId ?? null,
        mapName: mapMeta.mapName ?? 'New Map',
        width: mapMeta.width ?? 12,
        height: mapMeta.height ?? 12,
        hexes: hexArr,
        objects: mapObjects,
        tokens: tokens.map(t => ({
            id: t.id,
            characterId: t.characterId ?? null,
            ownerId: t.ownerId ?? null,
            name: t.name ?? '',
            type: t.type ?? (t.playerId ? 'pc' : 'monster'),
            q: t.q ?? 0,
            r: t.r ?? 0,
            visibleToPlayers: t.isHidden ? false : (t.visibleToPlayers !== false),
            // additive combat fields reused from the existing token shape
            color: t.color, size: t.size, hp: t.hp, maxHp: t.maxHp, ac: t.ac,
            speed: t.speed, init: t.init, statuses: t.statuses, initiativeRoll: t.initiativeRoll,
            playerId: t.playerId ?? t.characterId ?? null,
        })),
        gmNotes: mapMeta.gmNotes ?? '',
        playerDescription: mapMeta.playerDescription ?? '',
        backgroundImageUrl: backgroundImageUrl ?? null,
        hexConfig,
    };
}

// ---------------------------------------------------------
// VISIBILITY — players must NOT receive hidden data (player_interaction.txt)
// Returns a filtered copy of the JSON map safe to send to players.
// ---------------------------------------------------------
export function toPlayerView(mapJson = {}) {
    return {
        campaignId: mapJson.campaignId ?? null,
        mapName: mapJson.mapName ?? 'Map',
        width: mapJson.width ?? 12,
        height: mapJson.height ?? 12,
        hexes: (mapJson.hexes || []).filter(h => h.visibleToPlayers !== false),
        objects: (mapJson.objects || []).filter(o => o.visibleToPlayers !== false),
        tokens: (mapJson.tokens || []).filter(t => t.visibleToPlayers !== false),
        // gmNotes intentionally stripped
        playerDescription: mapJson.playerDescription ?? '',
        backgroundImageUrl: mapJson.backgroundImageUrl ?? null,
        hexConfig: mapJson.hexConfig ?? { ...DEFAULT_HEX_CONFIG },
    };
}

// ---------------------------------------------------------
// VALIDATION — used when importing AI / pasted JSON
// ---------------------------------------------------------
export function validateMap(obj) {
    if (!obj || typeof obj !== 'object') return { ok: false, error: 'Map must be a JSON object.' };
    if (!Array.isArray(obj.hexes)) return { ok: false, error: 'Map.hexes must be an array.' };
    for (const h of obj.hexes) {
        if (typeof h.q !== 'number' || typeof h.r !== 'number') {
            return { ok: false, error: 'Every hex needs numeric q and r.' };
        }
    }
    if (obj.objects && !Array.isArray(obj.objects)) return { ok: false, error: 'Map.objects must be an array.' };
    if (obj.tokens && !Array.isArray(obj.tokens)) return { ok: false, error: 'Map.tokens must be an array.' };
    return { ok: true, map: obj };
}
