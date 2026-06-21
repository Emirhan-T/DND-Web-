/* =========================================================
   HexMapBoard.jsx — Shared hex renderer for GM + Player.

   Rendered TWICE inside each dashboard's existing
   .canvas-transform-group so the kept drawing canvases stay
   layered correctly:
     <HexMapBoard layer="terrain" .../>   (below the draw canvases)
     <HexMapBoard layer="tokens"  .../>   (above the draw canvases)

   State lives in the parent dashboards; this component only
   renders + emits semantic callbacks. Pointer math uses the
   SVG screen CTM so it stays correct under pan/zoom/rotate.

   NOTE: every hook is called unconditionally before any return
   (rules-of-hooks), then we branch on `layer` to pick what to draw.
   ========================================================= */
import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
    TERRAINS, OBJECT_CATALOG, rectHexes,
    hexCenter, hexPolygonPoints, getRenderOrigin, pixelToAxial,
} from './hexUtils';
import './hexMap.css';

const CANVAS = 4000; // matches the dashboards' canvasSize

const HexMapBoard = ({
    layer = 'terrain',          // 'terrain' | 'tokens'
    role = 'gm',                // 'gm' | 'player'
    hexes = {},
    mapObjects = [],
    tokens = [],
    hexConfig = { size: 34, visible: true, opacity: 1 },
    mapMeta = { width: 12, height: 12 },
    activeTool = 'cursor',
    combatState = { isActive: false, currentTurnIndex: 0 },
    myCharId = null,
    myUserId = null,
    onHexAction,
    onTokenMove,
    onObjectMove,
    onTokenDoubleClick,
    onObjectClick,
}) => {
    const size = hexConfig.size || 34;
    const width = mapMeta.width || 12;
    const height = mapMeta.height || 12;
    const origin = useMemo(() => getRenderOrigin(width, height, size), [width, height, size]);

    const isHexTool = role === 'gm' && typeof activeTool === 'string' && activeTool.startsWith('hex-');

    // ---- hooks (unconditional) ----
    const paintingRef = useRef(false);
    const ctmRef = useRef(null);
    const [drag, setDrag] = useState(null); // { kind:'token'|'object', id, ghost:{x,y} }

    const clientToLocal = (clientX, clientY) => {
        const svg = ctmRef.current;
        if (!svg || !svg.getScreenCTM) return { x: clientX, y: clientY };
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: clientX, y: clientY };
        const pt = svg.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        const loc = pt.matrixTransform(ctm.inverse());
        return { x: loc.x, y: loc.y };
    };

    // Terrain painting: stop on mouseup anywhere
    useEffect(() => {
        if (layer !== 'terrain') return undefined;
        const stop = () => { paintingRef.current = false; };
        window.addEventListener('mouseup', stop);
        return () => window.removeEventListener('mouseup', stop);
    }, [layer]);

    // Token / object dragging (snap to hex on drop, live ghost while moving)
    useEffect(() => {
        if (layer !== 'tokens' || !drag) return undefined;
        const move = (e) => {
            const l = clientToLocal(e.clientX, e.clientY);
            setDrag(d => (d ? { ...d, ghost: l } : d));
        };
        const up = (e) => {
            const l = clientToLocal(e.clientX, e.clientY);
            const { q, r } = pixelToAxial(l.x - origin.ox, l.y - origin.oy, size);
            if (drag.kind === 'token') onTokenMove && onTokenMove(drag.id, q, r);
            else onObjectMove && onObjectMove(drag.id, q, r);
            setDrag(null);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layer, drag, origin, size]);

    const isOwnToken = (t) =>
        (myUserId && t.ownerId && String(t.ownerId) === String(myUserId)) ||
        (myCharId && t.characterId && String(t.characterId) === String(myCharId)) ||
        (myCharId && t.playerId && String(t.playerId) === String(myCharId));

    const handleHexDown = (q, r, e) => {
        if (!isHexTool) return;
        e.stopPropagation();
        paintingRef.current = true;
        onHexAction && onHexAction(q, r);
    };
    const handleHexEnter = (q, r) => {
        if (isHexTool && paintingRef.current) onHexAction && onHexAction(q, r);
    };
    const startDrag = (kind, id, center, e) => {
        e.stopPropagation();
        setDrag({ kind, id, ghost: center });
    };

    // ---------------- TERRAIN LAYER ----------------
    if (layer === 'terrain') {
        // GM renders the full W×H lattice so empty/erased cells stay visible and re-paintable.
        // Players only see the hexes they were given (already filtered + visible).
        const cellKeys = [];
        if (role === 'gm') {
            const seen = new Set();
            rectHexes(width, height).forEach(({ q, r }) => { const k = `${q},${r}`; seen.add(k); cellKeys.push(k); });
            Object.keys(hexes).forEach(k => { if (!seen.has(k)) cellKeys.push(k); }); // painted beyond bounds
        } else {
            cellKeys.push(...Object.keys(hexes));
        }
        return (
            <div className="hexmap-terrain-layer" style={{ position: 'absolute', inset: 0 }}>
                <svg
                    width={CANVAS} height={CANVAS} className="hexmap-svg"
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: isHexTool ? 'auto' : 'none' }}
                >
                    {hexConfig.visible && cellKeys.map((key) => {
                        const [q, r] = key.split(',').map(Number);
                        const c = hexCenter(q, r, size, origin);
                        const h = hexes[key];
                        const empty = !h;
                        const def = h ? (TERRAINS[h.terrain] || TERRAINS.grass) : null;
                        const blocked = h ? !h.walkable : false;
                        const hidden = h ? h.visibleToPlayers === false : false;
                        return (
                            <polygon
                                key={key}
                                points={hexPolygonPoints(c.x, c.y, size)}
                                fill={empty ? 'rgba(255,255,255,0.05)' : def.color}
                                fillOpacity={empty ? 1 : ((hexConfig.opacity ?? 1) * (hidden ? 0.45 : 1))}
                                stroke={blocked ? 'rgba(255,90,90,0.85)' : (empty ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.3)')}
                                strokeWidth={blocked ? 2 : 1}
                                strokeDasharray={hidden ? '6,4' : (empty ? '3,4' : undefined)}
                                className={`hexmap-hex ${isHexTool ? 'paintable' : ''} ${empty ? 'hexmap-empty' : ''}`}
                                onMouseDown={(e) => handleHexDown(q, r, e)}
                                onMouseEnter={() => handleHexEnter(q, r)}
                            />
                        );
                    })}
                </svg>
            </div>
        );
    }

    // ---------------- TOKENS / OBJECTS LAYER ----------------
    if (layer !== 'tokens') return null;

    return (
        <div className="hexmap-token-layer" style={{ position: 'absolute', inset: 0, width: CANVAS, height: CANVAS, pointerEvents: 'none' }}>
            {/* invisible reference for screen->local coordinate mapping */}
            <svg ref={ctmRef} width={CANVAS} height={CANVAS} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} aria-hidden="true" />

            {/* OBJECTS */}
            {mapObjects.map(o => {
                if (role === 'player' && o.visibleToPlayers === false) return null;
                const def = OBJECT_CATALOG[o.type] || {};
                const c = hexCenter(o.q, o.r, size, origin);
                const isGhost = drag && drag.kind === 'object' && drag.id === o.id;
                const left = isGhost ? drag.ghost.x : c.x;
                const top = isGhost ? drag.ghost.y : c.y;
                const canDrag = role === 'gm' && activeTool === 'cursor' && o.movable;
                const canPick = role === 'player' && activeTool === 'cursor' && o.pickable;
                const interactive = canDrag || canPick;
                return (
                    <div
                        key={o.id}
                        className={`hex-object ${o.visibleToPlayers === false ? 'obj-hidden' : ''} ${isGhost ? 'dragging' : ''}`}
                        style={{
                            position: 'absolute', left, top, transform: 'translate(-50%,-50%)',
                            fontSize: size * 1.1, lineHeight: 1,
                            pointerEvents: interactive ? 'auto' : 'none',
                            cursor: canDrag ? 'grab' : (canPick ? 'pointer' : 'default'),
                        }}
                        title={o.name || o.type}
                        onMouseDown={(e) => { if (canDrag) startDrag('object', o.id, c, e); }}
                        onClick={(e) => { if (canPick) { e.stopPropagation(); onObjectClick && onObjectClick(o); } }}
                    >
                        <span className="hex-object-icon">{def.icon || '❔'}</span>
                        {role === 'gm' && o.visibleToPlayers === false && <span className="obj-hidden-badge" title="Hidden from players">🙈</span>}
                        {o.name && <span className="hex-object-name">{o.name}</span>}
                    </div>
                );
            })}

            {/* TOKENS (reuses existing .map-token theme classes) */}
            {tokens.map((t, idx) => {
                if (role === 'player' && (t.visibleToPlayers === false || t.isHidden)) return null;
                const c = hexCenter(t.q ?? 0, t.r ?? 0, size, origin);
                const isGhost = drag && drag.kind === 'token' && drag.id === t.id;
                const left = isGhost ? drag.ghost.x : c.x;
                const top = isGhost ? drag.ghost.y : c.y;
                const own = isOwnToken(t);
                const canDrag = (role === 'gm' && activeTool === 'cursor') || (role === 'player' && activeTool === 'cursor' && own);
                const dim = size * 1.5 * (t.size || 1);
                const hiddenGm = role === 'gm' && (t.isHidden || t.visibleToPlayers === false);
                return (
                    <div
                        key={t.id}
                        className={`map-token color-${t.color || 'blue'} ${combatState && combatState.isActive && combatState.currentTurnIndex === idx ? 'active-turn-token' : ''} ${hiddenGm ? 'token-hidden' : ''} ${own && role === 'player' ? 'token-own' : ''} ${isGhost ? 'dragging' : ''}`}
                        style={{
                            left, top, width: dim, height: dim,
                            pointerEvents: canDrag ? 'auto' : 'none',
                            cursor: canDrag ? 'grab' : 'default',
                        }}
                        onMouseDown={(e) => { if (canDrag) startDrag('token', t.id, c, e); }}
                        onDoubleClick={() => { if (role === 'gm' && onTokenDoubleClick) onTokenDoubleClick(t); }}
                        title={role === 'gm' ? 'Double-click to edit' : (own ? 'Drag to move your token' : '')}
                    >
                        {hiddenGm && <span className="token-hidden-icon" title="Hidden from Players">👁️‍🗨️</span>}
                        {t.maxHp && (
                            <div className="token-hp-bar">
                                <div className="token-hp-fill" style={{ width: `${Math.min(100, Math.max(0, (t.hp / t.maxHp) * 100))}%` }} />
                            </div>
                        )}
                        {t.name && <span className="token-name-tag">{t.name}</span>}
                        {t.statuses && t.statuses.length > 0 && (
                            <div className="token-statuses-container">
                                {t.statuses.slice(0, 3).map(st => {
                                    const stName = typeof st === 'string' ? st : st.name;
                                    const stDuration = typeof st === 'string' ? null : st.duration;
                                    let extraClass = '';
                                    if (stName === 'Concentration') extraClass = 'st-conc';
                                    if (stName === 'Invisible') extraClass = 'st-inv';
                                    return (
                                        <span key={stName} className={`token-status-icon ${extraClass}`} title={stName} style={{ position: 'relative' }}>
                                            {stDuration && <span className="status-duration-badge">{stDuration}</span>}
                                        </span>
                                    );
                                })}
                                {t.statuses.length > 3 && <span className="token-status-more">+{t.statuses.length - 3}</span>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default HexMapBoard;
