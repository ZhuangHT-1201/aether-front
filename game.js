(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapCtx = minimapCanvas.getContext("2d");

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const TAU = Math.PI * 2;
  const WORLD = Object.freeze({ width: 3000, height: 1900 });
  const PLAYER = "player";
  const ENEMY = "enemy";
  const NEUTRAL = "neutral";

  const ui = {
    gameHud: $("#gameHud"),
    startScreen: $("#startScreen"),
    wave: $("#nextWaveValue"),
    time: $("#timeValue"),
    crystal: $("#crystalValue"),
    income: $("#incomeValue"),
    supply: $("#supplyValue"),
    supplyCap: $("#supplyCap"),
    difficultyCode: $("#difficultyCode"),
    pressureBars: $("#pressureBars"),
    protocolReward: $("#protocolReward"),
    threatLabel: $("#threatLabel"),
    threatBars: $("#threatBars"),
    missionTitle: $("#missionTitle"),
    tipText: $("#tipText"),
    tipRail: $("#tipRail"),
    placementHint: $("#placementHint"),
    selectionPortrait: $("#selectionPortrait"),
    selectionName: $("#selectionName"),
    selectionRole: $("#selectionRole"),
    selectionTier: $("#selectionTier"),
    selectionHealth: $("#selectionHealth"),
    selectionHp: $("#selectionHp"),
    selectionStatLabel: $("#selectionStatLabel"),
    selectionStat: $("#selectionStat"),
    selectionCount: $("#selectionCount"),
    selectionList: $("#selectionList"),
    commandGrid: $("#commandGrid"),
    commandHint: $("#commandHint"),
    tooltip: $("#commandTooltip"),
    toastStack: $("#toastStack"),
    pauseScreen: $("#pauseScreen"),
    endScreen: $("#endScreen"),
    helpScreen: $("#helpScreen"),
    soundButton: $("#soundButton"),
    zoomValue: $("#zoomValue"),
  };

  const UNIT_DEFS = {
    worker: {
      name: "拓荒者",
      role: "工程单位 · 采集 / 建造",
      hp: 110,
      armor: 0,
      damage: 8,
      range: 38,
      cooldown: 1.25,
      speed: 150,
      radius: 13,
      supply: 1,
      cost: 50,
      buildTime: 9,
      source: "core",
      tier: "I",
      statLabel: "载能",
      stat: "8",
    },
    ranger: {
      name: "长弓手",
      role: "远程突击 · 反制轻型单位",
      hp: 145,
      armor: 1,
      damage: 19,
      range: 185,
      cooldown: 1.05,
      speed: 112,
      radius: 14,
      supply: 1,
      cost: 85,
      buildTime: 11,
      source: "barracks",
      tier: "II",
      statLabel: "射程",
      stat: "185",
    },
    guard: {
      name: "重装守卫",
      role: "前线突击 · 高耐久装甲",
      hp: 315,
      armor: 4,
      damage: 34,
      range: 42,
      cooldown: 1.3,
      speed: 87,
      radius: 18,
      supply: 2,
      cost: 145,
      buildTime: 16,
      source: "barracks",
      tier: "III",
      statLabel: "装甲",
      stat: "4",
    },
  };

  const BUILDING_DEFS = {
    core: {
      name: "远征母舰",
      role: "指挥核心 · 生产拓荒者",
      hp: 2850,
      armor: 5,
      radius: 67,
      cost: 0,
      buildTime: 0,
      supply: 10,
      tier: "CORE",
      statLabel: "防御",
      stat: "相位脉冲",
    },
    enemyCore: {
      name: "腐化母巢",
      role: "敌方指挥核心 · 腐化源",
      hp: 2450,
      armor: 4,
      radius: 72,
      cost: 0,
      buildTime: 0,
      supply: 0,
      tier: "CORE",
      statLabel: "防御",
      stat: "酸蚀孢子",
    },
    barracks: {
      name: "折跃兵营",
      role: "军事建筑 · 训练作战单位",
      hp: 820,
      armor: 3,
      radius: 44,
      cost: 200,
      buildTime: 14,
      supply: 0,
      tier: "II",
      statLabel: "功能",
      stat: "单位生产",
    },
    habitat: {
      name: "生态栖息舱",
      role: "支援建筑 · 提升舰队编制",
      hp: 620,
      armor: 2,
      radius: 37,
      cost: 110,
      buildTime: 10,
      supply: 6,
      tier: "I",
      statLabel: "编制",
      stat: "+6",
    },
    turret: {
      name: "相位炮塔",
      role: "防御建筑 · 自动索敌",
      hp: 560,
      armor: 4,
      radius: 31,
      cost: 150,
      buildTime: 12,
      supply: 0,
      tier: "II",
      statLabel: "射程",
      stat: "235",
    },
  };

  const DIFFICULTIES = {
    cadet: {
      name: "新兵",
      code: "01",
      pressure: 1,
      reward: "战术档案 × 0.75",
      firstWave: 56,
      waveInterval: 41,
      enemyScale: 0.82,
      waveGrowth: 0.72,
    },
    veteran: {
      name: "老兵",
      code: "02",
      pressure: 2,
      reward: "战术档案 × 1.25",
      firstWave: 42,
      waveInterval: 33,
      enemyScale: 1,
      waveGrowth: 0.94,
    },
    nightmare: {
      name: "梦魇",
      code: "03",
      pressure: 3,
      reward: "战术档案 × 1.75",
      firstWave: 29,
      waveInterval: 25,
      enemyScale: 1.22,
      waveGrowth: 1.12,
    },
  };

  const ICONS = {
    worker: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="19" fill="rgba(87,232,196,.12)" stroke="currentColor" stroke-width="1.4"/><path d="m32 11 18 10v22L32 53 14 43V21Z" fill="rgba(7,27,21,.8)" stroke="currentColor" stroke-width="1.7"/><path d="m32 21 9 5v10l-9 6-9-6V26Z" fill="rgba(96,247,210,.22)" stroke="currentColor"/><circle cx="32" cy="32" r="3" fill="currentColor"/><path d="M14 24 5 18m45 6 9-6M14 42 5 48m45-6 9 6" stroke="currentColor" stroke-width="1.2"/></svg>`,
    ranger: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m20 52 8-18-5-11 9-7 10 8-2 14 8 14-8 3-5-13-8 13Z" fill="rgba(7,27,21,.8)" stroke="currentColor" stroke-width="1.5"/><circle cx="34" cy="19" r="6" fill="rgba(91,231,196,.2)" stroke="currentColor"/><path d="m25 33 32-9m-7-5 12 2-8 9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 52h27" stroke="currentColor" opacity=".45"/></svg>`,
    guard: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m15 23 13-11 20 8 5 18-8 17H21l-9-15Z" fill="rgba(7,27,21,.8)" stroke="currentColor" stroke-width="1.5"/><path d="M22 20 9 28l2 22 13 7 9-9-6-25Z" fill="rgba(95,240,203,.16)" stroke="currentColor" stroke-width="1.4"/><path d="M17 28h18v17H19Z" fill="rgba(4,17,13,.65)" stroke="currentColor"/><circle cx="39" cy="25" r="4" fill="currentColor"/><path d="m46 14 7 8-5 18-7-5Z" fill="rgba(9,31,24,.8)" stroke="currentColor"/></svg>`,
    core: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 46 20 17l12-8 15 8 10 29-16 14H23Z" fill="rgba(7,28,22,.8)" stroke="currentColor" stroke-width="1.3"/><path d="m32 6 10 17-10 29-10-29Z" fill="rgba(102,248,212,.18)" stroke="currentColor"/><circle cx="32" cy="35" r="10" fill="none" stroke="currentColor" stroke-dasharray="2 3"/><circle cx="32" cy="35" r="3.5" fill="currentColor"/><path d="M18 52h28M23 57h18" stroke="currentColor" opacity=".6"/></svg>`,
    enemyCore: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 4 22 15 6 24-18 17H19L4 42l8-23Z" fill="rgba(37,13,12,.8)" stroke="currentColor" stroke-width="1.3"/><path d="m32 10-8 17 8 29 9-29Z" fill="rgba(255,103,82,.18)" stroke="currentColor"/><circle cx="32" cy="33" r="13" fill="none" stroke="currentColor" stroke-dasharray="2 4"/><path d="m32 21 5 10-5 14-5-14Z" fill="currentColor"/><path d="m14 20-7-7m43 7 7-7M9 46 2 52m53-6 7 6" stroke="currentColor" opacity=".55"/></svg>`,
    barracks: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m7 47 5-25 21-12 24 11-4 29-24 8Z" fill="rgba(7,26,20,.8)" stroke="currentColor" stroke-width="1.4"/><path d="m19 44 2-18 12-6 12 7-3 21-12 4Z" fill="rgba(91,235,199,.12)" stroke="currentColor"/><path d="m23 40 20-9-3 13-14 4Z" fill="rgba(95,247,210,.3)" stroke="currentColor"/><path d="m25 13-7 22m26-19 9 22" stroke="currentColor" opacity=".55"/></svg>`,
    habitat: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m8 43 9-19 16-10 18 8 8 20-13 15H21Z" fill="rgba(7,26,20,.8)" stroke="currentColor" stroke-width="1.4"/><path d="M16 39c2-14 10-19 19-18 9 1 15 8 16 18-11 7-24 8-35 0Z" fill="rgba(101,231,197,.13)" stroke="currentColor"/><circle cx="31" cy="31" r="3" fill="currentColor"/><path d="M25 54v-8m14 8v-9M11 40H5m50-1h6" stroke="currentColor" opacity=".6"/></svg>`,
    turret: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m13 49 6-25 13-7 14 7 7 24-20 12Z" fill="rgba(7,26,20,.8)" stroke="currentColor" stroke-width="1.4"/><circle cx="33" cy="34" r="12" fill="rgba(92,238,201,.13)" stroke="currentColor"/><path d="m30 28 27-17m-3 4 7-1-3 7" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="33" cy="34" r="3" fill="currentColor"/><path d="m18 42-7 6m38-7 8 6" stroke="currentColor" opacity=".5"/></svg>`,
    crystal: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m31 5 16 20-4 30-15 5-13-9V24Z" fill="rgba(94,241,207,.13)" stroke="currentColor" stroke-width="1.3"/><path d="m31 5 5 26-17-7m17 7 11-6m-11 6-2 29" fill="none" stroke="currentColor" opacity=".8"/><path d="m12 30 13-9 6 10-17 23" fill="none" stroke="currentColor" opacity=".38"/></svg>`,
  };

  const COMMAND_ICONS = {
    attackmove: `<svg viewBox="0 0 24 24"><path d="m4 19 7-7m-3-3 6-6m-1 0h5v5M7 10l7 7M4 14l6-6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="16" r="2.3" fill="none" stroke="currentColor"/></svg>`,
    stop: `<svg viewBox="0 0 24 24"><path d="M6 5h12v14H6Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 9h6v6H9Z" fill="currentColor" opacity=".8"/></svg>`,
    hold: `<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    gather: `<svg viewBox="0 0 24 24"><path d="m12 2 6 7-2 11-4 2-4-3V9Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 2v20M6 9h12" stroke="currentColor" opacity=".6"/><path d="M19 3v5m-2.5-2.5h5" stroke="currentColor" stroke-width="1.2"/></svg>`,
    barracks: `<svg viewBox="0 0 24 24"><path d="m3 19 2-11 7-5 9 5-1 12-9 2Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m7 17 1-7 4-3 5 3-1 8-5 2Z" fill="none" stroke="currentColor"/><path d="m10 14 6-3" stroke="currentColor" opacity=".5"/></svg>`,
    habitat: `<svg viewBox="0 0 24 24"><path d="M3 18 6 8l6-5 7 4 3 10-6 5H7Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 15c1-6 5-8 9-6 3 1 4 4 4 6-4 3-9 3-13 0Z" fill="none" stroke="currentColor"/><path d="M11 22v-5m4 5v-5" stroke="currentColor" opacity=".6"/></svg>`,
    turret: `<svg viewBox="0 0 24 24"><path d="m5 20 2-10 5-4 6 4 2 8-7 4Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="13" cy="13" r="4" fill="none" stroke="currentColor"/><path d="m11 10 9-6m-1 1 3-1-1 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
    worker: `<svg viewBox="0 0 24 24"><path d="m12 3 7 4v9l-7 5-7-5V7Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m12 7 3 2v5l-3 2-3-2V9Z" fill="none" stroke="currentColor"/><path d="m5 8-3-2m17 2 3-2M5 16l-3 3m17-3 3 3" stroke="currentColor" opacity=".55"/></svg>`,
    ranger: `<svg viewBox="0 0 24 24"><path d="m8 21 3-8-2-5 3-4 5 3-1 6 3 8H8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m8 13 13-5m-3-1 4 1-2 3" stroke="currentColor" stroke-width="1.4"/></svg>`,
    guard: `<svg viewBox="0 0 24 24"><path d="m4 8 6-5 8 3 2 8-4 7H8l-4-6Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 7 3 10l1 9 6 2 4-4-4-10Z" fill="none" stroke="currentColor"/><path d="M16 5v6h4" stroke="currentColor" opacity=".65"/></svg>`,
  };

  const game = {
    started: false,
    paused: false,
    ended: false,
    outcome: null,
    outcomeAt: 0,
    difficulty: "veteran",
    elapsed: 0,
    crystals: 420,
    gathered: 0,
    kills: 0,
    wave: 0,
    nextWave: 42,
    waveAnnounced: false,
    selected: [],
    primaryId: null,
    groups: {},
    units: [],
    buildings: [],
    resources: [],
    projectiles: [],
    particles: [],
    rings: [],
    texts: [],
    wrecks: [],
    depositLog: [],
    shake: 0,
    muted: false,
    placement: null,
    pendingAttackMove: false,
    inputMode: "normal",
    lastShotSound: -10,
    tipDismissed: false,
    tipStage: 0,
    uiClock: 0,
    income: 0,
    objectives: {
      barracks: false,
      army: false,
      core: false,
    },
  };

  const camera = {
    x: 470,
    y: 1370,
    zoom: 1,
    minZoom: 0.62,
    maxZoom: 1.42,
  };

  const input = {
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, inside: false, down: false, button: -1 },
    dragStart: null,
    selectionBox: null,
    keys: new Set(),
    lastClick: { at: 0, id: null, kind: null },
    hoverId: null,
  };

  let dpr = 1;
  let cssWidth = window.innerWidth;
  let cssHeight = window.innerHeight;
  let entityId = 1;
  let terrainCanvas = null;
  let minimapTerrain = null;
  let uiSignature = "";
  let lastFrame = performance.now();
  let audioContext = null;
  let ambientNodes = [];
  let tutorialFirstWaveShown = false;

  function createRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatTime(seconds, withFraction = false) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const base = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    if (!withFraction) return base;
    const tenth = Math.floor((safe % 1) * 10);
    return `${base}.${tenth}`;
  }

  function teamColor(team, bright = false) {
    if (team === PLAYER) return bright ? "#9affe9" : "#65f6d2";
    if (team === ENEMY) return bright ? "#ffb1a6" : "#ff7563";
    return "#d5bf86";
  }

  function teamDark(team) {
    return team === ENEMY ? "#3b1715" : "#0b2d24";
  }

  function colorAlpha(hex, alpha) {
    const normalized = hex.replace("#", "");
    const full = normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function polygonPath(context, points) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }

  function regularPolygon(context, x, y, radius, sides, rotation = -Math.PI / 2) {
    context.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const angle = rotation + (i / sides) * TAU;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  }

  function getDifficulty() {
    return DIFFICULTIES[game.difficulty];
  }

  function getEntity(id) {
    return game.units.find((u) => u.id === id) ||
      game.buildings.find((b) => b.id === id) ||
      game.resources.find((r) => r.id === id);
  }

  function addUnit(kind, team, x, y, options = {}) {
    const def = UNIT_DEFS[kind];
    if (!def) return null;
    const unit = {
      id: entityId++,
      team,
      category: "unit",
      kind,
      name: def.name,
      x,
      y,
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      armor: def.armor,
      damage: def.damage,
      range: def.range,
      cooldown: def.cooldown,
      speed: def.speed,
      supply: def.supply,
      angle: options.angle ?? (team === PLAYER ? -0.5 : Math.PI - 0.5),
      attackTimer: Math.random() * 0.4,
      order: null,
      targetId: null,
      carry: 0,
      mineTimer: 0,
      mining: false,
      flash: 0,
      moving: false,
      bobSeed: Math.random() * TAU,
      selected: false,
      dead: false,
      hitPulse: 0,
    };
    game.units.push(unit);
    if (kind === "worker" && team === PLAYER && !options.noAutoGather) {
      const node = nearestResource(unit);
      if (node) issueGather(unit, node);
    }
    return unit;
  }

  function addBuilding(kind, team, x, y, options = {}) {
    const defKey = kind === "core" && team === ENEMY ? "enemyCore" : kind;
    const def = BUILDING_DEFS[defKey];
    if (!def) return null;
    const building = {
      id: entityId++,
      team,
      category: "building",
      kind: defKey,
      baseKind: kind,
      name: def.name,
      role: def.role,
      x,
      y,
      radius: def.radius,
      hp: options.underConstruction ? Math.max(1, def.hp * 0.12) : def.hp,
      maxHp: def.hp,
      armor: def.armor,
      damage: defKey === "core" ? 19 : defKey === "enemyCore" ? 22 : defKey === "turret" ? 27 : 0,
      range: defKey === "core" ? 230 : defKey === "enemyCore" ? 240 : defKey === "turret" ? 235 : 0,
      cooldown: defKey === "turret" ? 1.05 : 1.8,
      attackTimer: 0.8,
      barrelAngle: team === ENEMY ? Math.PI : 0,
      targetId: null,
      underConstruction: Boolean(options.underConstruction),
      progress: options.underConstruction ? 0.12 : 1,
      buildTime: def.buildTime,
      queue: [],
      queueProgress: 0,
      supplyBlocked: false,
      rally: null,
      selected: false,
      flash: 0,
      dead: false,
      spawnSeed: Math.random() * 10,
      builtAt: game.elapsed,
    };
    game.buildings.push(building);
    return building;
  }

  function addResource(x, y, amount = 720, variant = 0) {
    const resource = {
      id: entityId++,
      team: NEUTRAL,
      category: "resource",
      kind: "crystal",
      name: "星壤晶体",
      x,
      y,
      radius: 34,
      amount,
      maxAmount: amount,
      variant,
      dead: false,
    };
    game.resources.push(resource);
    return resource;
  }

  function getPlayerCore() {
    return game.buildings.find((b) => b.team === PLAYER && b.kind === "core" && !b.dead);
  }

  function getEnemyCore() {
    return game.buildings.find((b) => b.team === ENEMY && b.kind === "enemyCore" && !b.dead);
  }

  function nearestResource(position) {
    let best = null;
    let bestDistance = Infinity;
    for (const node of game.resources) {
      if (node.dead || node.amount <= 0) continue;
      const d = dist(position, node);
      if (d < bestDistance) {
        best = node;
        bestDistance = d;
      }
    }
    return best;
  }

  function nearestCore(team) {
    return game.buildings
      .filter((b) => b.team === team && (b.kind === "core" || b.kind === "enemyCore") && !b.dead)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
  }

  function resetGame(options = {}) {
    entityId = 1;
    game.started = false;
    game.paused = false;
    game.ended = false;
    game.outcome = null;
    game.outcomeAt = 0;
    game.elapsed = 0;
    game.crystals = options.resources ?? 420;
    game.gathered = 0;
    game.kills = 0;
    game.wave = 0;
    game.nextWave = getDifficulty().firstWave;
    game.waveAnnounced = false;
    game.selected = [];
    game.primaryId = null;
    game.groups = {};
    game.units = [];
    game.buildings = [];
    game.resources = [];
    game.projectiles = [];
    game.particles = [];
    game.rings = [];
    game.texts = [];
    game.wrecks = [];
    game.depositLog = [];
    game.shake = 0;
    game.placement = null;
    game.pendingAttackMove = false;
    game.inputMode = "normal";
    game.income = 0;
    game.objectives = { barracks: false, army: false, core: false };
    game.tipDismissed = false;
    game.tipStage = 0;
    uiSignature = "";
    tutorialFirstWaveShown = false;
    input.selectionBox = null;
    input.dragStart = null;
    updateTip("框选拓荒者，按 B 建造折跃兵营。先让经济持续运转。", false);

    addBuilding("core", PLAYER, 435, 1370);
    const enemyCore = addBuilding("core", ENEMY, 2600, 525);
    const enemyBarracks = addBuilding("barracks", ENEMY, 2435, 690);
    enemyBarracks.queue = [];
    addBuilding("turret", ENEMY, 2450, 510);
    addBuilding("turret", ENEMY, 2670, 700);
    addBuilding("turret", PLAYER, 720, 1515, { underConstruction: false });

    const startWorkers = [
      addUnit("worker", PLAYER, 315, 1450, { noAutoGather: true }),
      addUnit("worker", PLAYER, 335, 1320, { noAutoGather: true }),
      addUnit("worker", PLAYER, 505, 1500, { noAutoGather: true }),
      addUnit("worker", PLAYER, 540, 1270, { noAutoGather: true }),
    ];
    addUnit("ranger", PLAYER, 580, 1410);
    addUnit("ranger", PLAYER, 600, 1460);
    addUnit("ranger", ENEMY, 2350, 600);
    addUnit("ranger", ENEMY, 2320, 670);
    addUnit("guard", ENEMY, 2460, 630);
    addUnit("guard", ENEMY, 2570, 760);

    const resourceLayout = [
      [175, 1320, 880, 1],
      [205, 1535, 760, 2],
      [650, 1670, 640, 3],
      [815, 1210, 520, 4],
      [1450, 1470, 680, 5],
      [1620, 330, 620, 6],
      [2320, 330, 760, 7],
      [2780, 810, 840, 8],
      [2740, 285, 580, 9],
    ];
    resourceLayout.forEach(([x, y, amount, variant]) => addResource(x, y, amount, variant));

    startWorkers.forEach((worker) => {
      const node = nearestResource(worker);
      if (node) issueGather(worker, node);
    });

    game.selected = [...startWorkers];
    game.primaryId = startWorkers[0].id;
    startWorkers.forEach((worker) => { worker.selected = true; });
    camera.x = 460;
    camera.y = 1360;
    camera.zoom = 1;
    updateCameraClamp();
    buildTerrain();
    updateHud(true);
    renderMinimap();
  }

  function beginGame() {
    if (game.started) return;
    ensureAudio();
    game.started = true;
    game.paused = false;
    game.ended = false;
    ui.startScreen.classList.add("is-hidden");
    ui.startScreen.setAttribute("aria-hidden", "true");
    ui.gameHud.classList.remove("is-hidden");
    ui.gameHud.setAttribute("aria-hidden", "false");
    ui.pauseScreen.classList.add("is-hidden");
    ui.pauseScreen.setAttribute("aria-hidden", "true");
    ui.endScreen.classList.add("is-hidden");
    ui.endScreen.setAttribute("aria-hidden", "true");
    ui.helpScreen.classList.add("is-hidden");
    ui.helpScreen.setAttribute("aria-hidden", "true");
    startAmbient();
    playSound("deploy");
    toast(`作战协议 ${getDifficulty().name} 已启用`, "success");
    selectEntities(game.units.filter((u) => u.team === PLAYER && u.kind === "worker"));
    setTimeout(() => {
      if (!game.ended) toast("拓荒者正在自动采集晶能 · 按 B 建造兵营", "default", 4300);
    }, 700);
  }

  function updateCameraClamp() {
    const halfWidth = cssWidth / (2 * camera.zoom);
    const halfHeight = cssHeight / (2 * camera.zoom);
    const marginX = Math.max(240, Math.min(halfWidth * 0.65, WORLD.width / 2));
    const marginY = Math.max(180, Math.min(halfHeight * 0.6, WORLD.height / 2));
    camera.x = clamp(camera.x, marginX, WORLD.width - marginX);
    camera.y = clamp(camera.y, marginY, WORLD.height - marginY);
  }

  function selectEntities(entities, additive = false) {
    const valid = entities.filter((entity) => entity && !entity.dead);
    if (!additive) {
      game.selected.forEach((entity) => { entity.selected = false; });
      game.selected = [];
    }
    for (const entity of valid) {
      if (!game.selected.some((selected) => selected.id === entity.id)) {
        game.selected.push(entity);
        entity.selected = true;
      }
    }
    if (valid.length) {
      game.primaryId = valid[0].id;
    } else if (!additive) {
      game.primaryId = null;
    }
    uiSignature = "";
    updateHud(true);
    playSound("select");
  }

  function clearSelection() {
    game.selected.forEach((entity) => { entity.selected = false; });
    game.selected = [];
    game.primaryId = null;
    uiSignature = "";
    updateHud(true);
  }

  function removeFromSelection(entity) {
    game.selected = game.selected.filter((item) => item.id !== entity.id);
    entity.selected = false;
    if (game.primaryId === entity.id) {
      game.primaryId = game.selected[0]?.id ?? null;
    }
    uiSignature = "";
  }

  function getPrimary() {
    return game.selected.find((entity) => entity.id === game.primaryId) || game.selected[0] || null;
  }

  function issueGather(unit, node) {
    unit.order = { type: "gather", targetId: node.id };
    unit.targetId = null;
    unit.mining = false;
    unit.mineTimer = 0;
  }

  function issueMove(unit, x, y) {
    unit.order = { type: "move", x: clamp(x, 30, WORLD.width - 30), y: clamp(y, 30, WORLD.height - 30) };
    unit.targetId = null;
    unit.mining = false;
  }

  function issueAttack(unit, target) {
    unit.order = { type: "attack", targetId: target.id };
    unit.targetId = target.id;
    unit.mining = false;
  }

  function issueAttackMove(unit, x, y) {
    unit.order = { type: "attackmove", x: clamp(x, 30, WORLD.width - 30), y: clamp(y, 30, WORLD.height - 30) };
    unit.targetId = null;
    unit.mining = false;
  }

  function issueBuild(unit, building) {
    unit.order = { type: "build", targetId: building.id };
    unit.targetId = null;
    unit.mining = false;
  }

  function formationPoint(index, count, x, y) {
    if (count <= 1) return { x, y };
    const columns = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / columns);
    const col = index % columns;
    const gap = 28;
    return {
      x: x + (col - (columns - 1) / 2) * gap,
      y: y + (row - Math.floor((count - 1) / columns) / 2) * gap,
    };
  }

  function issueGroupMove(units, x, y, mode = "move") {
    const movable = units.filter((u) => !u.dead);
    movable.forEach((unit, index) => {
      const point = formationPoint(index, movable.length, x, y);
      if (mode === "attackmove") issueAttackMove(unit, point.x, point.y);
      else issueMove(unit, point.x, point.y);
    });
  }

  function calculateSupply(team) {
    return game.units
      .filter((unit) => unit.team === team && !unit.dead)
      .reduce((sum, unit) => sum + unit.supply, 0);
  }

  function calculateQueuedSupply(team) {
    return game.buildings
      .filter((b) => b.team === team && !b.dead)
      .flatMap((b) => b.queue)
      .reduce((sum, kind) => sum + (UNIT_DEFS[kind]?.supply || 0), 0);
  }

  function calculateSupplyCap(team) {
    return game.buildings
      .filter((b) => b.team === team && !b.dead && !b.underConstruction)
      .reduce((sum, b) => sum + (BUILDING_DEFS[b.kind]?.supply || 0), 0);
  }

  function spendCrystals(amount) {
    if (game.crystals < amount) return false;
    game.crystals -= amount;
    uiSignature = "";
    return true;
  }

  function hasResource(cost) {
    return game.crystals >= cost;
  }

  function addCrystals(amount, x, y) {
    game.crystals += amount;
    game.gathered += amount;
    game.depositLog.push({ time: game.elapsed, amount });
    createFloatingText(x, y, `+${amount}`, "#8effdf");
    createRing(x, y, 5, 42, "#6bebc5", 0.65);
    playSound("deposit");
    uiSignature = "";
  }

  function canPlaceBuilding(kind, x, y, ignoreId = null) {
    const def = BUILDING_DEFS[kind];
    if (!def) return false;
    if (x - def.radius < 35 || x + def.radius > WORLD.width - 35) return false;
    if (y - def.radius < 35 || y + def.radius > WORLD.height - 35) return false;
    const others = [...game.buildings, ...game.resources].filter((e) => !e.dead && e.id !== ignoreId);
    for (const entity of others) {
      if (dist({ x, y }, entity) < def.radius + entity.radius + 7) return false;
    }
    return true;
  }

  function setPlacement(kind) {
    const def = BUILDING_DEFS[kind];
    if (!def) return;
    const workers = game.selected.filter((e) => e.category === "unit" && e.team === PLAYER && e.kind === "worker");
    if (!workers.length) {
      toast("需要选择至少一名拓荒者才能建造", "warning");
      playSound("error");
      return;
    }
    if (!hasResource(def.cost)) {
      toast(`晶能不足 · 还需要 ${def.cost - game.crystals}`, "warning");
      playSound("error");
      return;
    }
    game.pendingAttackMove = false;
    game.placement = {
      kind,
      radius: def.radius,
      cost: def.cost,
      x: input.mouse.worldX,
      y: input.mouse.worldY,
      valid: false,
    };
    canvas.style.cursor = "crosshair";
    ui.placementHint.classList.add("is-visible");
    ui.placementHint.querySelector("b").textContent = `部署${def.name}`;
    uiSignature = "";
    updateHud(true);
    playSound("mode");
  }

  function cancelPlacement() {
    if (!game.placement && !game.pendingAttackMove) return;
    game.placement = null;
    game.pendingAttackMove = false;
    game.inputMode = "normal";
    canvas.style.cursor = "crosshair";
    ui.placementHint.classList.remove("is-visible");
    uiSignature = "";
    updateHud(true);
    playSound("cancel");
  }

  function setPendingAttackMove() {
    const units = game.selected.filter((e) => e.category === "unit" && e.team === PLAYER);
    if (!units.length) {
      toast("先选择作战单位", "warning");
      return;
    }
    cancelPlacement();
    game.pendingAttackMove = true;
    game.inputMode = "attackmove";
    canvas.style.cursor = "cell";
    playSound("mode");
    updateHud(true);
  }

  function confirmPlacement() {
    const placement = game.placement;
    if (!placement) return;
    if (!canPlaceBuilding(placement.kind, placement.x, placement.y)) {
      toast("此处空间不足，无法部署建筑", "warning");
      playSound("error");
      return;
    }
    if (!spendCrystals(placement.cost)) {
      toast("晶能不足", "warning");
      playSound("error");
      return;
    }
    const workers = game.selected
      .filter((e) => e.category === "unit" && e.team === PLAYER && e.kind === "worker" && !e.dead)
      .sort((a, b) => dist(a, placement) - dist(b, placement));
    if (!workers.length) {
      game.crystals += placement.cost;
      toast("建造者已失去响应", "warning");
      cancelPlacement();
      return;
    }
    const building = addBuilding(placement.kind, PLAYER, placement.x, placement.y, { underConstruction: true });
    workers[0].order = { type: "build", targetId: building.id };
    workers[0].targetId = null;
    workers[0].carry = workers[0].carry || 0;
    workers.slice(1, 3).forEach((worker) => {
      if (dist(worker, building) < 300 && (!worker.order || worker.order.type === "gather")) {
        worker.order = { type: "build", targetId: building.id };
      }
    });
    createRing(building.x, building.y, 18, building.radius + 30, "#72f3d0", 1.1);
    createParticles(building.x, building.y, "#8fffdf", 16, 48);
    playSound("place");
    toast(`${BUILDING_DEFS[placement.kind].name}部署完成 · 拓荒者开始施工`, "default");
    cancelPlacement();
    selectEntities([building], false);
  }

  function commandForOrder(targetEntity, point) {
    const units = game.selected.filter((e) => e.category === "unit" && e.team === PLAYER && !e.dead);
    const selectedBuildings = game.selected.filter((e) => e.category === "building" && e.team === PLAYER && !e.dead);

    if (targetEntity?.category === "building" && targetEntity.team === PLAYER && units.length === 0) {
      if (selectedBuildings.includes(targetEntity)) return;
    }

    if (!units.length) {
      selectedBuildings.forEach((building) => {
        if (["core", "barracks"].includes(building.kind) && point) {
          building.rally = { x: point.x, y: point.y };
          createRing(point.x, point.y, 4, 25, teamColor(PLAYER), 0.7);
          createFloatingText(point.x, point.y - 15, "集结点", "#8bead1");
        }
      });
      if (selectedBuildings.length) playSound("command");
      return;
    }

    let workerCount = 0;
    units.forEach((unit) => {
      if (targetEntity?.dead) return;
      if (unit.kind === "worker") workerCount += 1;

      if (targetEntity?.category === "resource") {
        if (unit.kind === "worker") issueGather(unit, targetEntity);
        else issueMove(unit, targetEntity.x + (Math.random() - 0.5) * 45, targetEntity.y + 50);
        return;
      }

      if (targetEntity?.team === PLAYER && targetEntity.underConstruction && unit.kind === "worker") {
        issueBuild(unit, targetEntity);
        return;
      }

      if (targetEntity && targetEntity.team !== PLAYER && targetEntity.team !== NEUTRAL) {
        issueAttack(unit, targetEntity);
        return;
      }

      if (point) issueMove(unit, point.x, point.y);
    });

    if (targetEntity?.team !== PLAYER && targetEntity?.team !== NEUTRAL) {
      createTargetMarker(targetEntity.x, targetEntity.y, "#ff8a76");
      playSound("order");
    } else if (targetEntity?.category === "resource") {
      createTargetMarker(targetEntity.x, targetEntity.y, "#76f4d0");
      playSound("order");
    } else if (point) {
      createTargetMarker(point.x, point.y, teamColor(PLAYER));
      playSound("order");
    }

    if (workerCount > 0 && targetEntity?.category === "resource" && game.selected.every((e) => e.kind === "worker")) {
      updateTip("拓荒者会往返母舰交付晶体。保持至少 3 名拓荒者持续采集。");
    }
  }

  function worldTargetAt(x, y) {
    return pickEntityAt(x, y, true);
  }

  function pickEntityAt(screenX, screenY, includeEnemy = true) {
    const worldPoint = screenToWorld(screenX, screenY);
    let best = null;
    let bestScore = Infinity;
    const pools = [game.units, game.buildings, game.resources];
    for (const pool of pools) {
      for (const entity of pool) {
        if (entity.dead) continue;
        if (!includeEnemy && entity.team !== PLAYER) continue;
        const d = Math.hypot(entity.x - worldPoint.x, entity.y - worldPoint.y);
        const hitRadius = entity.radius + (entity.category === "unit" ? 11 : 7);
        if (d <= hitRadius) {
          const priority = entity.category === "unit" ? -12 : entity.category === "building" ? -2 : 0;
          const score = d + priority;
          if (score < bestScore) {
            best = entity;
            bestScore = score;
          }
        }
      }
    }
    return best;
  }

  function screenToWorld(x, y) {
    return {
      x: (x - cssWidth / 2) / camera.zoom + camera.x,
      y: (y - cssHeight / 2) / camera.zoom + camera.y,
    };
  }

  function worldToScreen(x, y) {
    return {
      x: (x - camera.x) * camera.zoom + cssWidth / 2,
      y: (y - camera.y) * camera.zoom + cssHeight / 2,
    };
  }

  function updateMovement(unit, targetX, targetY, dt, stopDistance = 0) {
    const dx = targetX - unit.x;
    const dy = targetY - unit.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance + 1.5) {
      unit.moving = false;
      return true;
    }
    const speedScale = unit.kind === "guard" ? 0.97 : 1;
    const step = Math.min(distance, unit.speed * speedScale * dt);
    unit.angle = Math.atan2(dy, dx);
    unit.x += (dx / distance) * step;
    unit.y += (dy / distance) * step;
    unit.x = clamp(unit.x, 24, WORLD.width - 24);
    unit.y = clamp(unit.y, 24, WORLD.height - 24);
    unit.moving = true;
    return false;
  }

  function nearestEnemy(unit, maxRange) {
    let best = null;
    let bestScore = Infinity;
    const targets = [...game.units, ...game.buildings];
    for (const target of targets) {
      if (target.dead || target.team === unit.team || target.team === NEUTRAL) continue;
      const d = dist(unit, target) - target.radius * 0.5;
      const targetValue = target.category === "unit" ? 0 : target.kind === "core" || target.kind === "enemyCore" ? 24 : 13;
      const score = d + targetValue;
      if (d <= maxRange && score < bestScore) {
        best = target;
        bestScore = score;
      }
    }
    return best;
  }

  function attackRange(unit, target) {
    return unit.range + (target?.radius || 0) * 0.75;
  }

  function canAttack(unit) {
    return (unit.damage || 0) > 0;
  }

  function attackTarget(unit, target) {
    if (!target || target.dead || !canAttack(unit)) return;
    const distance = dist(unit, target);
    if (distance > attackRange(unit, target) + 3) return;
    unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
    if (unit.attackTimer > 0) return;
    unit.attackTimer = unit.cooldown;
    unit.hitPulse = 0.16;
    if (unit.range > 60) {
      spawnProjectile(unit, target);
    } else {
      damageEntity(target, unit.damage, unit);
      createSlash(unit.x, unit.y, unit.angle, teamColor(unit.team));
      createParticles(
        unit.x + Math.cos(unit.angle) * 30,
        unit.y + Math.sin(unit.angle) * 30,
        teamColor(unit.team, true),
        5,
        70
      );
    }
  }

  function updateCombatUnit(unit, dt) {
    const order = unit.order;

    if (!order) {
      const prey = nearestEnemy(unit, unit.kind === "guard" ? 215 : 255);
      if (prey) {
        unit.targetId = prey.id;
      }
      if (unit.targetId) {
        const target = getEntity(unit.targetId);
        if (!target || target.dead || target.team === unit.team || dist(unit, target) > 285) {
          unit.targetId = null;
        } else if (dist(unit, target) <= attackRange(unit, target)) {
          attackTarget(unit, target);
        } else {
          updateMovement(unit, target.x, target.y, dt, attackRange(unit, target) - 3);
        }
      }
      return;
    }

    if (order.type === "hold") {
      const target = getEntity(unit.targetId);
      if (!target || target.dead) unit.targetId = nearestEnemy(unit, unit.range + 95)?.id ?? null;
      const liveTarget = getEntity(unit.targetId);
      if (liveTarget) attackTarget(unit, liveTarget);
      return;
    }

    if (order.type === "attack") {
      const target = getEntity(order.targetId);
      if (!target || target.dead) {
        unit.order = null;
        unit.targetId = null;
        return;
      }
      unit.targetId = target.id;
      if (dist(unit, target) > attackRange(unit, target)) {
        updateMovement(unit, target.x, target.y, dt, attackRange(unit, target) - 2);
      } else {
        unit.moving = false;
        attackTarget(unit, target);
      }
      return;
    }

    if (order.type === "attackmove") {
      let target = getEntity(unit.targetId);
      if (!target || target.dead) {
        target = nearestEnemy(unit, 285);
        unit.targetId = target?.id ?? null;
      }
      if (target) {
        const distanceToOrder = Math.hypot(target.x - order.x, target.y - order.y);
        if (distanceToOrder < 430 || dist(unit, target) < 300) {
          if (dist(unit, target) > attackRange(unit, target)) {
            updateMovement(unit, target.x, target.y, dt, attackRange(unit, target) - 2);
          } else {
            unit.moving = false;
            attackTarget(unit, target);
          }
          return;
        }
        unit.targetId = null;
      }
      if (updateMovement(unit, order.x, order.y, dt, 10)) {
        unit.order = null;
        unit.targetId = null;
      }
      return;
    }

    if (order.type === "move") {
      if (updateMovement(unit, order.x, order.y, dt, 7)) {
        unit.order = null;
      }
    }
  }

  function updateWorker(unit, dt) {
    const order = unit.order;
    if (!order) {
      updateCombatUnit(unit, dt);
      return;
    }

    if (order.type === "gather") {
      let node = getEntity(order.targetId);
      if (!node || node.dead || node.amount <= 0) {
        node = nearestResource(unit);
        if (node) issueGather(unit, node);
        else unit.order = null;
        return;
      }
      if (unit.carry >= 20) {
        const core = nearestCore(PLAYER);
        if (core) unit.order = { type: "return", targetId: core.id, nodeId: node.id };
        return;
      }
      if (dist(unit, node) > node.radius + 22) {
        updateMovement(unit, node.x, node.y, dt, node.radius + 20);
        unit.mining = false;
      } else {
        unit.moving = false;
        unit.mining = true;
        unit.angle = Math.atan2(node.y - unit.y, node.x - unit.x);
        unit.mineTimer += dt;
        if (unit.mineTimer >= 0.62) {
          unit.mineTimer -= 0.62;
          const mined = Math.min(4, node.amount, 20 - unit.carry);
          node.amount -= mined;
          unit.carry += mined;
          if (Math.random() < 0.5) {
            createParticles(
              node.x + Math.cos(unit.angle + Math.PI) * 18,
              node.y + Math.sin(unit.angle + Math.PI) * 18,
              "#8fffe0",
              2,
              35
            );
          }
          if (node.amount <= 0) {
            createRing(node.x, node.y, 15, 60, "#8bf5d8", 0.8);
            createParticles(node.x, node.y, "#8fffe0", 13, 58);
            node.dead = true;
            toast("晶体矿脉已枯竭 · 拓荒者正在寻找下一处矿点", "warning");
          }
        }
      }
      return;
    }

    if (order.type === "return") {
      const core = nearestCore(PLAYER);
      if (!core) {
        unit.order = null;
        return;
      }
      if (dist(unit, core) > core.radius + 25) {
        updateMovement(unit, core.x, core.y, dt, core.radius + 22);
        unit.mining = false;
      } else {
        unit.moving = false;
        if (unit.carry > 0) {
          addCrystals(unit.carry, core.x, core.y - core.radius - 10);
          unit.carry = 0;
        }
        const previousNode = getEntity(order.nodeId);
        const node = !previousNode || previousNode.dead || previousNode.amount <= 0
          ? nearestResource(unit)
          : previousNode;
        if (node) issueGather(unit, node);
        else unit.order = null;
      }
      return;
    }

    if (order.type === "build") {
      const building = getEntity(order.targetId);
      if (!building || building.dead || !building.underConstruction) {
        unit.order = null;
        return;
      }
      const workDistance = building.radius + 25;
      if (dist(unit, building) > workDistance) {
        updateMovement(unit, building.x, building.y, dt, workDistance - 3);
      } else {
        unit.moving = false;
        unit.angle = Math.atan2(building.y - unit.y, building.x - unit.x);
        building.builderActive = true;
        if (Math.random() < dt * 4) {
          createParticles(
            building.x + (Math.random() - 0.5) * building.radius,
            building.y + (Math.random() - 0.5) * building.radius,
            "#8dfbe0",
            1,
            38
          );
        }
      }
      return;
    }

    updateCombatUnit(unit, dt);
  }

  function updateUnit(unit, dt) {
    unit.attackTimer = Math.max(0, unit.attackTimer - dt);
    unit.flash = Math.max(0, unit.flash - dt);
    unit.hitPulse = Math.max(0, unit.hitPulse - dt);
    if (unit.kind === "worker") updateWorker(unit, dt);
    else updateCombatUnit(unit, dt);
  }

  function updateBuilding(building, dt) {
    building.flash = Math.max(0, building.flash - dt);
    building.attackTimer = Math.max(0, building.attackTimer - dt);

    if (building.underConstruction) {
      building.builderActive = false;
      const builders = game.units.filter((unit) =>
        unit.team === PLAYER &&
        !unit.dead &&
        unit.kind === "worker" &&
        unit.order?.type === "build" &&
        unit.order.targetId === building.id &&
        dist(unit, building) <= building.radius + 35
      );
      if (builders.length) {
        building.builderActive = true;
        const buildSpeed = 1 + Math.min(1.25, (builders.length - 1) * 0.35);
        building.progress = Math.min(1, building.progress + (dt / Math.max(1, building.buildTime)) * buildSpeed);
        building.hp = Math.min(building.maxHp, building.maxHp * (0.12 + building.progress * 0.88));
        if (Math.random() < dt * 2.5) {
          createParticles(
            building.x + (Math.random() - 0.5) * building.radius * 1.4,
            building.y + (Math.random() - 0.5) * building.radius,
            "#8ef2d8",
            1,
            45
          );
        }
        if (building.progress >= 1) finishConstruction(building);
      }
      return;
    }

    if (building.queue.length) {
      const kind = building.queue[0];
      const def = UNIT_DEFS[kind];
      building.queueProgress += dt;
      if (building.queueProgress >= def.buildTime) {
        if (calculateSupply(building.team) + def.supply <= calculateSupplyCap(building.team)) {
          const spawnAngle = building.rally
            ? Math.atan2(building.rally.y - building.y, building.rally.x - building.x)
            : building.team === PLAYER ? Math.PI * 0.3 : Math.PI;
          const spawnDistance = building.radius + 26;
          const spawned = addUnit(
            kind,
            building.team,
            building.x + Math.cos(spawnAngle) * spawnDistance,
            building.y + Math.sin(spawnAngle) * spawnDistance
          );
          if (spawned && building.rally) issueMove(spawned, building.rally.x, building.rally.y);
          if (building.team === PLAYER) {
            createRing(spawned.x, spawned.y, 3, 30, "#75f0cf", 0.6);
            toast(`${def.name}已抵达战场`, "default", 1800);
            playSound("spawn");
          }
          building.queue.shift();
          building.queueProgress = 0;
          building.supplyBlocked = false;
        } else if (building.team === PLAYER && !building.supplyBlocked) {
          toast("编制已满，单位生产暂停", "warning");
          building.queueProgress = def.buildTime;
          building.supplyBlocked = true;
        }
        uiSignature = "";
      }
    }

    if (["turret", "core", "enemyCore"].includes(building.kind)) {
      const target = nearestEnemy(building, building.range + 70);
      if (target) {
        building.targetId = target.id;
        building.barrelAngle = Math.atan2(target.y - building.y, target.x - building.x);
        if (dist(building, target) <= building.range && building.attackTimer <= 0) {
          building.attackTimer = building.cooldown;
          spawnProjectile(building, target, building.kind === "turret" ? "beam" : "phase");
        }
      }
    }
  }

  function finishConstruction(building) {
    if (!building.underConstruction) return;
    building.underConstruction = false;
    building.progress = 1;
    building.hp = building.maxHp;
    building.builtAt = game.elapsed;
    game.units.forEach((unit) => {
      if (unit.order?.type === "build" && unit.order.targetId === building.id) {
        unit.order = null;
        unit.targetId = null;
      }
    });
    createRing(building.x, building.y, 20, building.radius + 48, "#9fffe2", 1);
    createParticles(building.x, building.y, "#b8ffe9", 28, 95);
    playSound("complete");
    toast(`${building.name}建造完成`, "success", 2600);
    if (building.team === PLAYER) {
      if (building.kind === "barracks") {
        game.objectives.barracks = true;
        updateTip("折跃兵营已上线。选择兵营后按 R 训练长弓手，按 G 训练重装守卫。");
        toast("新任务：训练 6 名战斗单位", "default", 3800);
      }
      if (building.kind === "habitat" && calculateSupply(PLAYER) + 3 >= calculateSupplyCap(PLAYER)) {
        updateTip("编制即将满载。继续建造生态栖息舱，为后续部队腾出编制。");
      }
    }
    uiSignature = "";
    updateHud(true);
  }

  function spawnProjectile(source, target, style = "bolt") {
    const shotAngle = source.barrelAngle ?? source.angle ?? 0;
    const originX = source.x + Math.cos(shotAngle) * (source.radius * 0.6);
    const originY = source.y + Math.sin(shotAngle) * (source.radius * 0.6);
    const projectile = {
      id: entityId++,
      x: originX,
      y: originY,
      prevX: originX,
      prevY: originY,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      team: source.team,
      sourceKind: source.kind,
      damage: (source.damage || 10) * (source.kind === "ranger" ? 1 : 1.25),
      speed: style === "beam" ? 920 : style === "phase" ? 780 : 650,
      style,
      life: 0,
      dead: false,
    };
    game.projectiles.push(projectile);
    if (game.elapsed - game.lastShotSound > 0.11) {
      game.lastShotSound = game.elapsed;
      playSound(source.category === "building" ? "beam" : "shot");
    }
  }

  function updateProjectiles(dt) {
    for (const projectile of game.projectiles) {
      if (projectile.dead) continue;
      const target = getEntity(projectile.targetId);
      if (!target || target.dead) {
        projectile.dead = true;
        continue;
      }
      projectile.targetX = target.x;
      projectile.targetY = target.y;
      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const step = projectile.speed * dt;
      projectile.life += dt;
      if (distance <= step + target.radius * 0.4) {
        projectile.dead = true;
        damageEntity(target, projectile.damage, projectile);
        createRing(target.x, target.y, 3, target.category === "building" ? 42 : 22, teamColor(projectile.team, true), 0.32);
        createParticles(target.x, target.y, teamColor(projectile.team, true), 6, 65);
      } else {
        projectile.x += (dx / distance) * step;
        projectile.y += (dy / distance) * step;
      }
      if (projectile.life > 3.5) projectile.dead = true;
    }
    game.projectiles = game.projectiles.filter((projectile) => !projectile.dead);
  }

  function damageEntity(target, amount, source) {
    if (!target || target.dead || target.team === NEUTRAL) return;
    const applied = Math.max(1, amount - (target.armor || 0) * 0.52);
    target.hp -= applied;
    target.flash = 0.16;
    if (target.category === "building") game.shake = Math.min(7, game.shake + 1.2);
    if (target.hp <= 0) destroyEntity(target, source);
  }

  function destroyEntity(entity, source) {
    if (entity.dead) return;
    entity.dead = true;
    entity.hp = 0;
    removeFromSelection(entity);
    const deathColor = teamColor(entity.team, true);
    if (entity.category === "building") {
      game.wrecks.push({
        x: entity.x,
        y: entity.y,
        radius: entity.radius,
        team: entity.team,
        kind: entity.kind,
        life: 999,
      });
      createRing(entity.x, entity.y, 8, entity.radius * 2.8, deathColor, 1.2);
      createParticles(entity.x, entity.y, deathColor, 44, 145, 1.8);
      createParticles(entity.x, entity.y, "#ffd49a", 20, 110, 1.1);
      game.shake = 12;
      playSound("explosion");
      if (entity.kind === "enemyCore") {
        game.objectives.core = true;
        toast("腐化母巢结构崩解 · 任务目标达成", "success", 5000);
        setOutcome("victory");
      } else if (entity.kind === "core" && entity.team === PLAYER) {
        toast("远征母舰失去信号", "warning", 4000);
        setOutcome("defeat");
      } else if (entity.team === ENEMY) {
        toast(`${entity.name}已被摧毁`, "success", 2200);
      }
    } else {
      createParticles(entity.x, entity.y, deathColor, entity.kind === "guard" ? 20 : 12, 90, 0.8);
      createRing(entity.x, entity.y, 3, entity.kind === "guard" ? 37 : 24, deathColor, 0.45);
      if (entity.team === ENEMY) {
        game.kills += 1;
        playSound("kill");
      }
    }
    if (entity.kind === "worker" && entity.team === PLAYER) {
      const remainingWorkers = game.units.filter((u) => u.team === PLAYER && u.kind === "worker" && !u.dead);
      if (!remainingWorkers.length) toast("警告：已无拓荒者可以维持经济", "warning", 4500);
    }
    uiSignature = "";
  }

  function setOutcome(outcome) {
    if (game.outcome) return;
    game.outcome = outcome;
    game.outcomeAt = game.elapsed + 1.8;
    game.pendingAttackMove = false;
    game.placement = null;
  }

  function completeMission() {
    if (game.ended) return;
    game.ended = true;
    game.paused = true;
    const victory = game.outcome === "victory";
    const survivors = game.units.filter((u) => u.team === PLAYER && !u.dead).length;
    $("#endTitle").textContent = victory ? "裂隙已肃清" : "母舰信号中断";
    $("#endKicker").textContent = victory ? "MISSION ACCOMPLISHED" : "OPERATION FAILED";
    $("#endCopy").textContent = victory
      ? "腐化母巢停止响应，星门航道重新开放。远征军得以继续向星壤深处推进。"
      : "远征母舰已被腐化潮吞没。重新集结部队，夺回裂隙盆地。";
    $("#resultTime").textContent = formatTime(game.elapsed);
    $("#resultKills").textContent = String(game.kills);
    $("#resultCrystals").textContent = String(game.gathered);
    $("#resultSurvivors").textContent = String(survivors);
    $("#endEmblem").classList.toggle("is-defeat", !victory);
    $("#endEmblem").innerHTML = victory
      ? `<svg viewBox="0 0 80 80"><path d="m40 5 30 17v36L40 75 10 58V22Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m27 40 9 9 18-20" fill="none" stroke="currentColor" stroke-width="3"/></svg>`
      : `<svg viewBox="0 0 80 80"><path d="m40 5 30 17v36L40 75 10 58V22Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m29 29 22 22m0-22L29 51" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
    ui.endScreen.classList.remove("is-hidden");
    ui.endScreen.setAttribute("aria-hidden", "false");
    playSound(victory ? "victory" : "defeat");
    renderMinimap();
  }

  function spawnWave() {
    if (game.outcome) return;
    game.wave += 1;
    const difficulty = getDifficulty();
    const enemyBarracks = game.buildings.find((b) => b.team === ENEMY && b.kind === "barracks" && !b.dead) ||
      getEnemyCore();
    const origin = enemyBarracks || { x: 2450, y: 620 };
    const waveCount = Math.min(13, Math.round((2 + game.wave * difficulty.waveGrowth) * difficulty.enemyScale));
    const units = [];
    for (let i = 0; i < waveCount; i += 1) {
      const isGuard = game.wave >= 2 && (i === 0 || i % 4 === 3);
      const kind = isGuard ? "guard" : "ranger";
      const angle = i * 2.399 + game.wave * 0.8;
      const radius = 48 + (i % 4) * 16;
      const unit = addUnit(
        kind,
        ENEMY,
        origin.x + Math.cos(angle) * radius,
        origin.y + Math.sin(angle) * radius,
        { noAutoGather: true }
      );
      if (unit) {
        unit.hp *= difficulty.enemyScale;
        unit.maxHp *= difficulty.enemyScale;
        unit.damage *= 0.92 + difficulty.enemyScale * 0.15;
        units.push(unit);
      }
    }
    const target = getPlayerCore() || { x: 435, y: 1370 };
    issueGroupMove(units, target.x + (Math.random() - 0.5) * 90, target.y + (Math.random() - 0.5) * 90, "attackmove");
    game.waveAnnounced = false;
    game.nextWave = Math.max(17, difficulty.waveInterval - (game.wave - 1) * 1.4);
    toast(`第 ${game.wave} 波腐化部队正在逼近`, "warning", 3900);
    setTimeout(() => {
      if (!game.ended && game.outcome !== "victory") playSound("warning");
    }, 450);
  }

  function updateAI(dt) {
    if (game.outcome) return;
    game.nextWave -= dt;
    if (game.nextWave <= 8 && !game.waveAnnounced) {
      game.waveAnnounced = true;
      if (!tutorialFirstWaveShown) {
        tutorialFirstWaveShown = true;
        toast("侦测到敌群：让重装守卫站在长弓手前方", "warning", 4300);
        updateTip("敌群会优先冲击母舰。用 Q 攻击移动清剿沿途目标，不要只守在家门口。");
      } else {
        toast("敌方生物信号正在集结", "warning", 2800);
      }
      playSound("alert");
    }
    if (game.nextWave <= 0) spawnWave();

  }

  function updateEffects(dt) {
    game.particles = game.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) return false;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.26, dt);
      particle.vy *= Math.pow(0.26, dt);
      particle.vy += particle.gravity * dt;
      return true;
    });
    game.rings = game.rings.filter((ring) => {
      ring.life -= dt;
      ring.radius = lerp(ring.radius, ring.maxRadius, Math.min(1, dt * 5));
      return ring.life > 0;
    });
    game.texts = game.texts.filter((text) => {
      text.life -= dt;
      text.y -= 17 * dt;
      return text.life > 0;
    });
    game.shake = Math.max(0, game.shake - dt * 18);
  }

  function separateUnits() {
    const units = game.units.filter((unit) => !unit.dead);
    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minimum = (a.radius + b.radius) * 0.7;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > 0.01 && distanceSq < minimum * minimum) {
          const distance = Math.sqrt(distanceSq);
          const push = (minimum - distance) * 0.5;
          const nx = dx / distance;
          const ny = dy / distance;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  function updateGame(dt) {
    if (!game.started || game.paused || game.ended) return;
    game.elapsed += dt;
    updateEffects(dt);
    game.projectiles.forEach((projectile) => {
      // Projectile simulation is performed below so target lookups see current positions.
      projectile.life += 0;
    });
    updateProjectiles(dt);
    game.buildings.forEach((building) => {
      if (!building.dead) updateBuilding(building, dt);
    });
    game.units.forEach((unit) => {
      if (!unit.dead) updateUnit(unit, dt);
    });
    separateUnits();
    updateAI(dt);
    game.units = game.units.filter((unit) => !unit.dead);
    game.buildings = game.buildings.filter((building) => !building.dead);
    game.resources = game.resources.filter((resource) => !resource.dead);
    game.selected = game.selected.filter((entity) => !entity.dead);
    if (game.primaryId && !getEntity(game.primaryId)) {
      game.primaryId = game.selected[0]?.id ?? null;
    }
    game.depositLog = game.depositLog.filter((entry) => game.elapsed - entry.time <= 60);
    game.income = game.depositLog.reduce((sum, entry) => sum + entry.amount, 0);
    if (game.outcome && game.elapsed >= game.outcomeAt) completeMission();
    game.uiClock += dt;
    if (game.uiClock >= 0.1) {
      game.uiClock = 0;
      updateHud();
      updateInputCursor();
      renderMinimap();
    }
  }

  // ------------------------------------------------------------
  // Terrain and world rendering
  // ------------------------------------------------------------

  function buildTerrain() {
    terrainCanvas = document.createElement("canvas");
    terrainCanvas.width = WORLD.width;
    terrainCanvas.height = WORLD.height;
    const tctx = terrainCanvas.getContext("2d");
    const rng = createRng(0x73a4c1);

    const baseGradient = tctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
    baseGradient.addColorStop(0, "#11201c");
    baseGradient.addColorStop(0.42, "#16271f");
    baseGradient.addColorStop(0.7, "#1a2820");
    baseGradient.addColorStop(1, "#251d18");
    tctx.fillStyle = baseGradient;
    tctx.fillRect(0, 0, WORLD.width, WORLD.height);

    const playerGlow = tctx.createRadialGradient(420, 1370, 20, 420, 1370, 530);
    playerGlow.addColorStop(0, "rgba(70, 148, 120, 0.19)");
    playerGlow.addColorStop(0.45, "rgba(39, 91, 73, 0.09)");
    playerGlow.addColorStop(1, "rgba(12, 25, 20, 0)");
    tctx.fillStyle = playerGlow;
    tctx.fillRect(0, 700, 1100, 1200);

    const enemyGlow = tctx.createRadialGradient(2590, 535, 10, 2590, 535, 620);
    enemyGlow.addColorStop(0, "rgba(171, 74, 48, 0.2)");
    enemyGlow.addColorStop(0.5, "rgba(91, 52, 33, 0.08)");
    enemyGlow.addColorStop(1, "rgba(25, 17, 13, 0)");
    tctx.fillStyle = enemyGlow;
    tctx.fillRect(1800, 0, 1200, 1250);

    // Broad mineral and moss variation.
    for (let i = 0; i < 560; i += 1) {
      const x = rng() * WORLD.width;
      const y = rng() * WORLD.height;
      const radius = 10 + rng() * 92;
      const warm = x > 2100 ? 14 : 0;
      const green = x < 900 ? 30 : 22;
      tctx.fillStyle = `rgba(${58 + warm + rng() * 18}, ${72 + green + rng() * 17}, ${52 + rng() * 14}, ${0.013 + rng() * 0.036})`;
      tctx.beginPath();
      tctx.ellipse(x, y, radius * (0.5 + rng()), radius * (0.25 + rng() * 0.55), rng() * TAU, 0, TAU);
      tctx.fill();
    }

    // Ancient traversal lane.
    const route = new Path2D();
    route.moveTo(435, 1370);
    route.bezierCurveTo(950, 1190, 1280, 1260, 1590, 990);
    route.bezierCurveTo(1900, 720, 2190, 770, 2600, 525);
    tctx.save();
    tctx.lineCap = "round";
    tctx.lineJoin = "round";
    tctx.strokeStyle = "rgba(105, 105, 73, 0.2)";
    tctx.lineWidth = 310;
    tctx.stroke(route);
    tctx.strokeStyle = "rgba(143, 128, 87, 0.11)";
    tctx.lineWidth = 245;
    tctx.stroke(route);
    tctx.strokeStyle = "rgba(208, 184, 125, 0.06)";
    tctx.lineWidth = 105;
    tctx.stroke(route);
    tctx.setLineDash([4, 30]);
    tctx.lineDashOffset = 18;
    tctx.strokeStyle = "rgba(210, 207, 160, 0.16)";
    tctx.lineWidth = 1.2;
    tctx.stroke(route);
    tctx.restore();

    // Dark tectonic scars add depth without acting as impassable walls.
    for (let i = 0; i < 8; i += 1) {
      const startX = 820 + i * 260 + rng() * 90;
      const startY = 80 + rng() * 250;
      const length = 380 + rng() * 480;
      tctx.beginPath();
      tctx.moveTo(startX, startY);
      let px = startX;
      let py = startY;
      for (let j = 0; j < 5; j += 1) {
        px += (rng() - 0.5) * 120;
        py += length / 5;
        tctx.lineTo(px, py);
      }
      tctx.strokeStyle = "rgba(4, 12, 10, 0.16)";
      tctx.lineWidth = 5 + rng() * 11;
      tctx.stroke();
      tctx.strokeStyle = "rgba(90, 144, 123, 0.07)";
      tctx.lineWidth = 0.8;
      tctx.stroke();
    }

    // Survey grid.
    tctx.save();
    tctx.strokeStyle = "rgba(151, 189, 171, 0.045)";
    tctx.lineWidth = 0.7;
    for (let x = 0; x <= WORLD.width; x += 100) {
      tctx.beginPath();
      tctx.moveTo(x, 0);
      tctx.lineTo(x, WORLD.height);
      tctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 100) {
      tctx.beginPath();
      tctx.moveTo(0, y);
      tctx.lineTo(WORLD.width, y);
      tctx.stroke();
    }
    tctx.restore();

    // Broken alien stonework.
    for (let i = 0; i < 34; i += 1) {
      const x = 150 + rng() * (WORLD.width - 300);
      const y = 100 + rng() * (WORLD.height - 200);
      if (Math.hypot(x - 435, y - 1370) < 240 || Math.hypot(x - 2600, y - 525) < 250) continue;
      const size = 6 + rng() * 17;
      tctx.save();
      tctx.translate(x, y);
      tctx.rotate(rng() * TAU);
      tctx.fillStyle = "rgba(97, 104, 85, 0.11)";
      polygonPath(tctx, [
        [-size, size * 0.2],
        [-size * 0.35, -size * 0.65],
        [size, -size * 0.2],
        [size * 0.55, size * 0.7],
      ]);
      tctx.fill();
      tctx.strokeStyle = "rgba(189, 180, 137, 0.07)";
      tctx.stroke();
      tctx.restore();
    }

    // Grass tufts and crystal dust.
    for (let i = 0; i < 1350; i += 1) {
      const x = rng() * WORLD.width;
      const y = rng() * WORLD.height;
      const size = 1 + rng() * 4;
      tctx.strokeStyle = x > 2250
        ? `rgba(159, 120, 78, ${0.04 + rng() * 0.06})`
        : `rgba(99, 157, 121, ${0.04 + rng() * 0.08})`;
      tctx.lineWidth = 0.55 + rng() * 0.7;
      tctx.beginPath();
      tctx.moveTo(x, y);
      tctx.lineTo(x + (rng() - 0.5) * size * 2, y - size * (1.2 + rng()));
      tctx.stroke();
    }

    // Survey annotations embedded in the terrain.
    tctx.save();
    tctx.font = "600 9px Bahnschrift, sans-serif";
    tctx.letterSpacing = "0.17em";
    tctx.fillStyle = "rgba(155, 192, 173, 0.1)";
    tctx.fillText("GRID 07 // AETHER BASIN", 116, 178);
    tctx.fillText("SECTOR R-13", 1220, 1770);
    tctx.strokeStyle = "rgba(175, 205, 188, 0.07)";
    tctx.beginPath();
    tctx.moveTo(116, 188);
    tctx.lineTo(340, 188);
    tctx.stroke();
    tctx.restore();

    // Subtle central rift sigil.
    tctx.save();
    tctx.translate(1585, 980);
    tctx.rotate(-0.18);
    tctx.strokeStyle = "rgba(135, 178, 153, 0.07)";
    tctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      tctx.beginPath();
      tctx.arc(0, 0, 74 + i * 22, i * 0.9, TAU - i * 1.2);
      tctx.stroke();
    }
    tctx.setLineDash([2, 9]);
    tctx.beginPath();
    tctx.arc(0, 0, 143, 0, TAU);
    tctx.stroke();
    tctx.restore();

    // Soft map edge shading.
    const edge = tctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 620, WORLD.width / 2, WORLD.height / 2, 1850);
    edge.addColorStop(0, "rgba(0,0,0,0)");
    edge.addColorStop(0.72, "rgba(2,9,7,0.08)");
    edge.addColorStop(1, "rgba(1,7,5,0.52)");
    tctx.fillStyle = edge;
    tctx.fillRect(0, 0, WORLD.width, WORLD.height);

    minimapTerrain = document.createElement("canvas");
    minimapTerrain.width = 260;
    minimapTerrain.height = 154;
    const mctx = minimapTerrain.getContext("2d");
    mctx.drawImage(terrainCanvas, 0, 0, WORLD.width, WORLD.height, 0, 0, 260, 154);
    const vignette = mctx.createRadialGradient(130, 77, 26, 130, 77, 165);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(2,8,7,0.44)");
    mctx.fillStyle = vignette;
    mctx.fillRect(0, 0, 260, 154);
  }

  function drawSelectionRing(entity, color = teamColor(entity.team), scale = 1) {
    if (!entity.selected && input.hoverId !== entity.id) return;
    const radius = (entity.radius + (entity.selected ? 9 : 6)) * scale;
    const pulse = 0.66 + Math.sin(performance.now() * 0.004 + entity.id) * 0.14;
    ctx.save();
    ctx.translate(entity.x, entity.y + 5);
    ctx.scale(1, 0.52);
    ctx.strokeStyle = colorAlpha(color, pulse);
    ctx.lineWidth = entity.selected ? 2 : 1;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = performance.now() * 0.008;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = colorAlpha(color, pulse * 0.22);
    ctx.lineWidth = entity.selected ? 8 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + performance.now() * 0.0003;
      ctx.save();
      ctx.rotate(angle);
      ctx.strokeStyle = colorAlpha(color, 0.72);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(radius * 0.78, 0);
      ctx.lineTo(radius * 1.04, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHealthBar(entity, width = 34, yOffset = 0) {
    if (!entity.selected && entity.hp >= entity.maxHp && input.hoverId !== entity.id) return;
    const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
    const x = entity.x - width / 2;
    const y = entity.y - entity.radius - 15 + yOffset;
    ctx.save();
    ctx.fillStyle = "rgba(2, 8, 6, 0.76)";
    ctx.fillRect(x - 1, y - 1, width + 2, 5);
    ctx.fillStyle = entity.team === ENEMY ? "#ff7867" : ratio < 0.35 ? "#f2b165" : "#66efcb";
    ctx.fillRect(x, y, width * ratio, 3);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(x, y, width * ratio, 1);
    ctx.restore();
  }

  function drawBuildingPad(entity) {
    const color = teamColor(entity.team);
    const pulse = 0.5 + Math.sin(performance.now() * 0.0017 + entity.id) * 0.12;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.scale(1, 0.54);
    ctx.fillStyle = "rgba(1, 8, 6, 0.42)";
    ctx.beginPath();
    ctx.arc(8, 14, entity.radius * 1.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius * 1.08, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = colorAlpha(color, pulse * 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius * 0.93, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawCore(entity) {
    drawSelectionRing(entity, teamColor(entity.team), 1.08);
    drawBuildingPad(entity);
    const enemy = entity.team === ENEMY;
    const color = teamColor(entity.team);
    const bright = teamColor(entity.team, true);
    const time = performance.now() * 0.001;
    const pulse = 0.66 + Math.sin(time * 2.1 + entity.id) * 0.18;
    const constructionAlpha = entity.underConstruction ? 0.46 : 1;

    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.globalAlpha = constructionAlpha;

    ctx.save();
    ctx.scale(1, 0.55);
    ctx.fillStyle = "rgba(0, 5, 4, 0.52)";
    ctx.beginPath();
    ctx.ellipse(8, 12, entity.radius * 1.04, entity.radius * 1.04, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.scale(1, 0.56);
    regularPolygon(ctx, 0, 0, entity.radius * 0.94, enemy ? 8 : 6, Math.PI / 6);
    ctx.fillStyle = enemy ? "#241713" : "#102b23";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.38);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    regularPolygon(ctx, 0, 0, entity.radius * 0.77, enemy ? 8 : 6, Math.PI / 6);
    ctx.fillStyle = enemy ? "#361c17" : "#173c30";
    ctx.fill();
    ctx.strokeStyle = "rgba(195, 207, 174, 0.08)";
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.rotate((i / 6) * TAU + time * 0.035);
      ctx.fillStyle = colorAlpha(color, 0.12);
      ctx.fillRect(entity.radius * 0.72, -3, entity.radius * 0.22, 6);
      ctx.restore();
    }
    ctx.restore();

    ctx.strokeStyle = colorAlpha(color, 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius * 0.72, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate(time * (enemy ? -0.1 : 0.12) + i * (TAU / 3));
      ctx.strokeStyle = colorAlpha(color, 0.26 + i * 0.04);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, entity.radius * (0.86 + i * 0.04), 0.1, Math.PI * 0.64);
      ctx.stroke();
      ctx.restore();
    }

    // Three grounded stabilizer fins.
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate((i / 3) * TAU + Math.PI / 6);
      polygonPath(ctx, [
        [entity.radius * 0.55, -10],
        [entity.radius * 1.0, -18],
        [entity.radius * 1.08, 9],
        [entity.radius * 0.56, 15],
      ]);
      ctx.fillStyle = enemy ? "#2b1a16" : "#132c24";
      ctx.fill();
      ctx.strokeStyle = colorAlpha(color, 0.24);
      ctx.stroke();
      ctx.restore();
    }

    // Energy shaft.
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    const shaft = ctx.createLinearGradient(0, -72, 0, 30);
    shaft.addColorStop(0, colorAlpha(bright, 0.03));
    shaft.addColorStop(0.45, colorAlpha(color, 0.34));
    shaft.addColorStop(1, colorAlpha(color, 0.06));
    polygonPath(ctx, [[-16, 16], [-10, -66], [0, -83], [10, -66], [16, 16]]);
    ctx.fillStyle = shaft;
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.43);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    regularPolygon(ctx, 0, -14, 28, 6, Math.PI / 6);
    ctx.fillStyle = enemy ? "#3a211b" : "#18382e";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.56);
    ctx.stroke();
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    regularPolygon(ctx, 0, -23, 12 + pulse * 2, 6, Math.PI / 6);
    ctx.fillStyle = colorAlpha(bright, 0.78);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.72)";
    regularPolygon(ctx, 0, -24, 4, 6, Math.PI / 6);
    ctx.fill();

    // Faction crest lights.
    ctx.fillStyle = colorAlpha(color, 0.7);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU;
      ctx.fillRect(Math.cos(angle) * entity.radius * 0.64 - 2, Math.sin(angle) * entity.radius * 0.52 - 1, 4, 2);
    }

    if (enemy) {
      ctx.strokeStyle = "rgba(255, 103, 82, .42)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * TAU + 0.35;
        const length = 18 + (i % 3) * 9 + Math.sin(time + i) * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * entity.radius * 0.72, Math.sin(angle) * entity.radius * 0.42);
        ctx.quadraticCurveTo(
          Math.cos(angle + 0.12) * (entity.radius + length * 0.6),
          Math.sin(angle + 0.12) * (entity.radius * 0.6 + length * 0.4) - 7,
          Math.cos(angle) * (entity.radius + length),
          Math.sin(angle) * (entity.radius * 0.5 + length * 0.3)
        );
        ctx.stroke();
      }
    }

    ctx.restore();

    if (entity.underConstruction) drawConstructionOverlay(entity);
    drawHealthBar(entity, 74, -15);
    if (input.hoverId === entity.id) drawEntityLabel(entity);
    if (entity.rally && entity.selected) drawRallyMarker(entity.rally);
  }

  function drawBarracks(entity) {
    drawSelectionRing(entity);
    drawBuildingPad(entity);
    const color = teamColor(entity.team);
    const bright = teamColor(entity.team, true);
    const pulse = 0.62 + Math.sin(performance.now() * 0.002 + entity.id) * 0.13;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.globalAlpha = entity.underConstruction ? 0.52 : 1;

    ctx.fillStyle = "rgba(0,5,4,.5)";
    ctx.beginPath();
    ctx.ellipse(8, 12, entity.radius * 1.05, entity.radius * 0.56, 0, 0, TAU);
    ctx.fill();

    polygonPath(ctx, [
      [-38, 20],
      [-31, -17],
      [-9, -31],
      [30, -22],
      [40, 8],
      [21, 26],
      [-20, 28],
    ]);
    ctx.fillStyle = entity.team === ENEMY ? "#2b1915" : "#142a23";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.35);
    ctx.lineWidth = 1.3;
    ctx.stroke();

    polygonPath(ctx, [
      [-22, 12],
      [-17, -13],
      [2, -22],
      [25, -13],
      [26, 11],
      [8, 20],
      [-10, 18],
    ]);
    ctx.fillStyle = entity.team === ENEMY ? "#39221c" : "#214036";
    ctx.fill();
    ctx.strokeStyle = "rgba(205, 225, 210, .1)";
    ctx.stroke();

    // Launch lane and energy aperture.
    polygonPath(ctx, [[-9, 15], [10, 8], [18, 19], [-2, 27]]);
    ctx.fillStyle = colorAlpha(color, 0.08);
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = colorAlpha(color, pulse);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(8, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Roof ribs.
    for (let i = -1; i <= 1; i += 1) {
      ctx.strokeStyle = colorAlpha(color, 0.2 + i * 0.02);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-24 + i * 7, -6);
      ctx.lineTo(20 + i * 3, -9);
      ctx.stroke();
    }

    // Side antennae.
    ctx.strokeStyle = "rgba(168, 194, 180, .25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-28, -14);
    ctx.lineTo(-35, -39);
    ctx.moveTo(28, -14);
    ctx.lineTo(35, -39);
    ctx.stroke();
    ctx.fillStyle = colorAlpha(bright, 0.65);
    ctx.fillRect(-36, -41, 3, 3);
    ctx.fillRect(34, -41, 3, 3);

    if (entity.queue.length) {
      const ratio = clamp(entity.queueProgress / UNIT_DEFS[entity.queue[0]].buildTime, 0, 1);
      ctx.strokeStyle = colorAlpha(color, 0.19);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 30, -Math.PI / 2, TAU - Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = colorAlpha(bright, 0.74);
      ctx.beginPath();
      ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
      ctx.stroke();
    }

    ctx.restore();
    if (entity.underConstruction) drawConstructionOverlay(entity);
    drawHealthBar(entity, 48, 0);
    if (input.hoverId === entity.id) drawEntityLabel(entity);
    if (entity.rally && entity.selected) drawRallyMarker(entity.rally);
  }

  function drawHabitat(entity) {
    drawSelectionRing(entity);
    drawBuildingPad(entity);
    const color = teamColor(entity.team);
    const bright = teamColor(entity.team, true);
    const t = performance.now() * 0.001;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.globalAlpha = entity.underConstruction ? 0.52 : 1;

    ctx.fillStyle = "rgba(0,5,4,.48)";
    ctx.beginPath();
    ctx.ellipse(7, 11, entity.radius * 1.08, entity.radius * 0.54, 0, 0, TAU);
    ctx.fill();

    // Support arms.
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.rotate((i / 4) * TAU + Math.PI / 4);
      ctx.fillStyle = entity.team === ENEMY ? "#2c1915" : "#153027";
      ctx.fillRect(24, -4, 21, 8);
      ctx.strokeStyle = colorAlpha(color, 0.18);
      ctx.strokeRect(24, -4, 21, 8);
      ctx.restore();
    }

    regularPolygon(ctx, 0, 0, 31, 8, Math.PI / 8);
    ctx.fillStyle = entity.team === ENEMY ? "#302019" : "#18372d";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.3);
    ctx.stroke();

    const dome = ctx.createRadialGradient(-8, -12, 2, 0, 0, 29);
    dome.addColorStop(0, colorAlpha(bright, 0.33));
    dome.addColorStop(0.55, colorAlpha(color, 0.1));
    dome.addColorStop(1, "rgba(4,16,12,.72)");
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.arc(0, -6, 25, Math.PI, 0);
    ctx.quadraticCurveTo(25, 15, 0, 15);
    ctx.quadraticCurveTo(-25, 15, -25, -6);
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.4);
    ctx.stroke();

    // Window strips.
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillStyle = colorAlpha(bright, 0.24 + Math.sin(t * 2 + i) * 0.04);
      ctx.fillRect(i * 7 - 1, -8 + Math.abs(i) * 1.4, 2, 10);
    }
    ctx.restore();
    if (entity.underConstruction) drawConstructionOverlay(entity);
    drawHealthBar(entity, 42, 0);
    if (input.hoverId === entity.id) drawEntityLabel(entity);
  }

  function drawTurret(entity) {
    drawSelectionRing(entity);
    drawBuildingPad(entity);
    const color = teamColor(entity.team);
    const bright = teamColor(entity.team, true);
    const t = performance.now() * 0.001;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.globalAlpha = entity.underConstruction ? 0.52 : 1;

    ctx.fillStyle = "rgba(0,5,4,.5)";
    ctx.beginPath();
    ctx.ellipse(6, 9, 34, 17, 0, 0, TAU);
    ctx.fill();
    regularPolygon(ctx, 0, 0, 27, 6, Math.PI / 6);
    ctx.fillStyle = entity.team === ENEMY ? "#301b17" : "#163026";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.33);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(entity.barrelAngle);
    ctx.fillStyle = entity.team === ENEMY ? "#402a20" : "#213e34";
    polygonPath(ctx, [[-6, -7], [28, -5], [35, 0], [28, 5], [-6, 7]]);
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.3);
    ctx.stroke();
    ctx.fillStyle = colorAlpha(bright, 0.6);
    ctx.fillRect(29, -2, 7, 4);
    ctx.restore();

    regularPolygon(ctx, 0, 0, 14, 8, Math.PI / 8);
    ctx.fillStyle = "#0a1b15";
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.43);
    ctx.stroke();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorAlpha(bright, 0.68 + Math.sin(t * 2.8) * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    if (entity.underConstruction) drawConstructionOverlay(entity);
    drawHealthBar(entity, 40, 0);
    if (input.hoverId === entity.id) drawEntityLabel(entity);
  }

  function drawConstructionOverlay(entity) {
    const ratio = clamp(entity.progress, 0, 1);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.strokeStyle = "rgba(120, 244, 213, .3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 2, entity.radius * 1.14, entity.radius * 0.64, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scaffold ribs.
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + Math.PI / 4;
      ctx.save();
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(159, 255, 231, .26)";
      ctx.beginPath();
      ctx.moveTo(entity.radius * 0.35, 0);
      ctx.lineTo(entity.radius * 0.9, 0);
      ctx.lineTo(entity.radius * 0.75, -entity.radius * 0.46);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(5, 19, 15, .82)";
    ctx.fillRect(-34, entity.radius * 0.58, 68, 11);
    ctx.fillStyle = "rgba(104, 243, 208, .22)";
    ctx.fillRect(-33, entity.radius * 0.58 + 1, 66, 9);
    ctx.fillStyle = "#69f1cd";
    ctx.fillRect(-33, entity.radius * 0.58 + 1, 66 * ratio, 9);
    ctx.fillStyle = "#03100d";
    ctx.font = "600 7px Bahnschrift, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`DEPLOY ${Math.round(ratio * 100)}%`, 0, entity.radius * 0.58 + 8);
    ctx.restore();
  }

  function drawEntityLabel(entity) {
    const color = teamColor(entity.team);
    const label = entity.category === "resource" ? `${entity.name} · ${entity.amount}` : entity.name;
    ctx.save();
    ctx.font = "500 11px Microsoft YaHei UI, sans-serif";
    const metrics = ctx.measureText(label);
    const width = metrics.width + 18;
    const x = entity.x - width / 2;
    const y = entity.y - entity.radius - 37;
    ctx.fillStyle = "rgba(3, 12, 9, .88)";
    ctx.fillRect(x, y, width, 19);
    ctx.strokeStyle = colorAlpha(color, 0.26);
    ctx.strokeRect(x, y, width, 19);
    ctx.fillStyle = colorAlpha(color, 0.84);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, entity.x, y + 10);
    ctx.restore();
  }

  function drawRallyMarker(rally) {
    const t = performance.now() * 0.003;
    ctx.save();
    ctx.translate(rally.x, rally.y);
    ctx.strokeStyle = "rgba(122, 243, 211, .38)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 + Math.sin(t) * 2, 8, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(118, 241, 209, .72)";
    polygonPath(ctx, [[0, -18], [6, -8], [0, -11], [-6, -8]]);
    ctx.fill();
    ctx.restore();
  }

  function drawUnit(unit) {
    drawSelectionRing(unit, teamColor(unit.team), 0.9);
    const color = teamColor(unit.team);
    const bright = teamColor(unit.team, true);
    const bob = unit.kind === "worker"
      ? Math.sin(performance.now() * 0.0035 + unit.bobSeed) * 2.2
      : unit.moving ? Math.sin(performance.now() * 0.011 + unit.bobSeed) * 1.2 : 0;
    const angle = unit.angle || 0;

    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.fillStyle = "rgba(0, 5, 4, .46)";
    ctx.beginPath();
    ctx.ellipse(unit.radius * 0.35, unit.radius * 0.58 + 3, unit.radius * 0.9, unit.radius * 0.43, 0, 0, TAU);
    ctx.fill();

    if (unit.kind === "worker") {
      ctx.save();
      ctx.translate(0, bob);
      ctx.rotate(angle);
      const armAngle = performance.now() * 0.0014 + unit.bobSeed;
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(armAngle + i * (TAU / 3));
        ctx.strokeStyle = colorAlpha(color, 0.44);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(19, 0);
        ctx.stroke();
        ctx.fillStyle = colorAlpha(bright, 0.62);
        ctx.fillRect(17, -1.5, 4, 3);
        ctx.restore();
      }
      regularPolygon(ctx, 0, 0, 12.5, 6, Math.PI / 6);
      ctx.fillStyle = unit.team === ENEMY ? "#3a1c17" : "#16372d";
      ctx.fill();
      ctx.strokeStyle = colorAlpha(color, 0.62);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      regularPolygon(ctx, 0, 0, 7, 6, Math.PI / 6);
      ctx.fillStyle = unit.team === ENEMY ? "#7b2f22" : "#217f66";
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = colorAlpha(bright, 0.82);
      ctx.beginPath();
      ctx.arc(1, -1, 2.5, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (unit.carry > 0) {
        ctx.rotate(-angle);
        ctx.fillStyle = "#a9ffe6";
        ctx.shadowColor = "#74fbd4";
        ctx.shadowBlur = 7;
        polygonPath(ctx, [[-4, 2], [0, -5], [4, 2], [1, 7]]);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    } else if (unit.kind === "guard") {
      ctx.save();
      ctx.rotate(angle);
      const stride = unit.moving ? Math.sin(performance.now() * 0.012 + unit.bobSeed) * 4 : 0;
      ctx.fillStyle = unit.team === ENEMY ? "#3b211b" : "#203c32";
      ctx.fillRect(-12, -14 + stride, 8, 10);
      ctx.fillRect(-12, 5 - stride, 8, 9);

      // Shield forward.
      ctx.fillStyle = unit.team === ENEMY ? "#51241c" : "#193a2e";
      polygonPath(ctx, [[8, -18], [19, -13], [21, 1], [16, 16], [8, 20], [4, 7], [5, -8]]);
      ctx.fill();
      ctx.strokeStyle = colorAlpha(color, 0.54);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.strokeStyle = colorAlpha(bright, 0.24);
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(17, 1);
      ctx.lineTo(10, 11);
      ctx.stroke();

      // Armored torso.
      polygonPath(ctx, [[-10, -11], [5, -16], [12, -7], [8, 10], [-6, 14], [-13, 3]]);
      ctx.fillStyle = unit.team === ENEMY ? "#4a261e" : "#28483c";
      ctx.fill();
      ctx.strokeStyle = colorAlpha(color, 0.4);
      ctx.stroke();
      ctx.fillStyle = colorAlpha(bright, 0.66);
      ctx.beginPath();
      ctx.arc(2, -5, 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.rotate(angle);
      const stride = unit.moving ? Math.sin(performance.now() * 0.012 + unit.bobSeed) * 2 : 0;
      ctx.strokeStyle = unit.team === ENEMY ? "#6c3025" : "#2a6050";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.lineTo(-12, -8 + stride);
      ctx.moveTo(-7, 3);
      ctx.lineTo(-12, 9 - stride);
      ctx.stroke();
      ctx.fillStyle = unit.team === ENEMY ? "#52271e" : "#1f4c3e";
      polygonPath(ctx, [[-9, -9], [5, -10], [11, -2], [8, 8], [-6, 8], [-11, 2]]);
      ctx.fill();
      ctx.strokeStyle = colorAlpha(color, 0.43);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = colorAlpha(bright, 0.72);
      ctx.beginPath();
      ctx.arc(2, -2, 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = unit.team === ENEMY ? "#ad5441" : "#67d8b9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(1, -7);
      ctx.lineTo(26, -10);
      ctx.stroke();
      ctx.fillStyle = colorAlpha(bright, 0.65);
      ctx.fillRect(24, -11.2, 7, 2.6);
      ctx.restore();
    }

    if (unit.flash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(255,255,255,${unit.flash * 4.2})`;
      ctx.beginPath();
      ctx.arc(0, -2, unit.radius * 1.1, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    if (unit.mining) {
      ctx.strokeStyle = colorAlpha(bright, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, unit.radius + 5, performance.now() * 0.004, performance.now() * 0.004 + 1.2);
      ctx.stroke();
    }
    ctx.restore();
    drawHealthBar(unit, unit.kind === "guard" ? 39 : 31, 0);
    if (input.hoverId === unit.id) drawEntityLabel(unit);
  }

  function drawResource(node) {
    const ratio = clamp(node.amount / node.maxAmount, 0, 1);
    const t = performance.now() * 0.001;
    const rng = createRng(9001 + node.variant * 617);
    const scale = 0.54 + ratio * 0.46;
    const glowPulse = 0.68 + Math.sin(t * 1.7 + node.variant) * 0.17;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.fillStyle = "rgba(0,5,4,.38)";
    ctx.beginPath();
    ctx.ellipse(7, 9, 40 * scale, 20 * scale, -0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(104, 235, 199, ${0.1 + ratio * 0.08})`;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 35 * scale, 18 * scale, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    const count = Math.max(3, Math.round(9 * (0.35 + ratio * 0.65)));
    const shards = [];
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * TAU;
      const radius = 3 + rng() * 23 * scale;
      shards.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.52,
        size: 5 + rng() * 12 * scale,
        lean: (rng() - 0.5) * 0.7,
        bob: rng() * TAU,
      });
    }
    shards.sort((a, b) => a.y - b.y);
    shards.forEach((shard) => {
      const size = shard.size;
      const rise = Math.sin(t * 1.6 + shard.bob) * 2;
      ctx.save();
      ctx.translate(shard.x, shard.y + rise);
      ctx.rotate(shard.lean);
      ctx.shadowColor = "#69f4cf";
      ctx.shadowBlur = 8 * glowPulse;
      polygonPath(ctx, [
        [-size * 0.34, -size * 0.08],
        [-size * 0.12, -size * 0.78],
        [size * 0.27, -size * 0.48],
        [size * 0.2, size * 0.42],
        [-size * 0.23, size * 0.27],
      ]);
      const grad = ctx.createLinearGradient(0, -size, 0, size);
      grad.addColorStop(0, "rgba(185,255,232,.92)");
      grad.addColorStop(0.4, "rgba(90,229,192,.72)");
      grad.addColorStop(1, "rgba(19,91,72,.7)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(169,255,231,.45)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, -size * 0.68);
      ctx.lineTo(-size * 0.02, size * 0.28);
      ctx.strokeStyle = "rgba(225,255,245,.35)";
      ctx.stroke();
      ctx.restore();
    });
    // A persistent ground glimmer identifies the resource node.
    ctx.shadowColor = "#6ef7d1";
    ctx.shadowBlur = 15;
    ctx.fillStyle = `rgba(115, 250, 213, ${0.25 * glowPulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 5, 31 * scale, 14 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    drawHealthBar({
      ...node,
      hp: node.amount,
      maxHp: node.maxAmount,
      selected: false,
      team: PLAYER,
    }, 34, 0);
    if (input.hoverId === node.id) drawEntityLabel(node);
  }

  function drawWreck(wreck) {
    ctx.save();
    ctx.translate(wreck.x, wreck.y);
    ctx.rotate(0.31);
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = "rgba(6, 7, 6, .78)";
    polygonPath(ctx, [
      [-wreck.radius * 0.8, wreck.radius * 0.3],
      [-wreck.radius * 0.5, -wreck.radius * 0.48],
      [wreck.radius * 0.1, -wreck.radius * 0.6],
      [wreck.radius * 0.78, -wreck.radius * 0.18],
      [wreck.radius * 0.62, wreck.radius * 0.36],
      [-wreck.radius * 0.2, wreck.radius * 0.54],
    ]);
    ctx.fill();
    ctx.strokeStyle = "rgba(225, 111, 77, .08)";
    ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.08) {
      ctx.fillStyle = "rgba(255, 121, 77, .28)";
      ctx.beginPath();
      ctx.arc(wreck.x + Math.random() * 25 - 12, wreck.y + Math.random() * 15 - 7, 1.5 + Math.random() * 2, 0, TAU);
      ctx.fill();
    }
  }

  function drawMiningBeams() {
    for (const unit of game.units) {
      if (!unit.mining || unit.dead || unit.kind !== "worker") continue;
      const node = getEntity(unit.order?.targetId);
      if (!node || node.dead) continue;
      const gradient = ctx.createLinearGradient(unit.x, unit.y, node.x, node.y);
      gradient.addColorStop(0, "rgba(149,255,226,.74)");
      gradient.addColorStop(0.55, "rgba(90,240,200,.45)");
      gradient.addColorStop(1, "rgba(210,255,242,.7)");
      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1 + Math.sin(performance.now() * 0.02 + unit.id) * 0.35;
      ctx.shadowColor = "#76f4d0";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(unit.x, unit.y - 2);
      ctx.quadraticCurveTo(
        (unit.x + node.x) / 2 + Math.sin(performance.now() * 0.006 + unit.id) * 8,
        (unit.y + node.y) / 2 - 16,
        node.x,
        node.y
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderAmbientMotes() {
    const t = performance.now() * 0.001;
    ctx.save();
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 397 + Math.sin(t * 0.11 + i) * 55 + WORLD.width) % WORLD.width;
      const y = (i * 223 + Math.cos(t * 0.08 + i * 1.7) * 31 + WORLD.height) % WORLD.height;
      ctx.fillStyle = i % 5 === 0 ? "rgba(213,199,144,.12)" : "rgba(134,236,204,.09)";
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + (i % 4) * 0.45, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlacementGhost() {
    if (!game.placement) return;
    const placement = game.placement;
    const color = placement.valid ? "#75f3d0" : "#ff7766";
    const def = BUILDING_DEFS[placement.kind];
    const pulse = 0.7 + Math.sin(performance.now() * 0.007) * 0.15;
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.scale(1, 0.56);
    ctx.fillStyle = colorAlpha(color, placement.valid ? 0.075 : 0.1);
    ctx.strokeStyle = colorAlpha(color, pulse);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, placement.radius + 13, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.66;
    ctx.rotate(Math.PI / 6);
    regularPolygon(ctx, 0, 0, placement.radius * 0.78, 6, 0);
    ctx.fillStyle = colorAlpha(color, 0.13);
    ctx.fill();
    ctx.strokeStyle = colorAlpha(color, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (placement.kind === "turret") {
      ctx.save();
      ctx.strokeStyle = colorAlpha(color, 0.12);
      ctx.fillStyle = colorAlpha(color, 0.018);
      ctx.beginPath();
      ctx.arc(placement.x, placement.y, 235, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.font = "500 10px Microsoft YaHei UI, sans-serif";
    const label = placement.valid ? `${def.name} · ${def.cost} 晶能` : "部署位置受阻";
    const width = ctx.measureText(label).width + 18;
    ctx.fillStyle = "rgba(3, 14, 11, .92)";
    ctx.fillRect(placement.x - width / 2, placement.y + placement.radius * 0.75 + 13, width, 22);
    ctx.strokeStyle = colorAlpha(color, 0.4);
    ctx.strokeRect(placement.x - width / 2, placement.y + placement.radius * 0.75 + 13, width, 22);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, placement.x, placement.y + placement.radius * 0.75 + 24);
    ctx.restore();
  }

  function drawProjectiles() {
    for (const projectile of game.projectiles) {
      const color = teamColor(projectile.team, true);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = projectile.style === "beam" ? 12 : 8;
      if (projectile.style === "beam") {
        const dx = projectile.x - projectile.prevX;
        const dy = projectile.y - projectile.prevY;
        const length = Math.max(1, Math.hypot(dx, dy));
        ctx.strokeStyle = colorAlpha(color, 0.9);
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(projectile.x - (dx / length) * 23, projectile.y - (dy / length) * 23);
        ctx.lineTo(projectile.x, projectile.y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.76)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = colorAlpha(color, 0.44);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(projectile.prevX, projectile.prevY);
        ctx.lineTo(projectile.x, projectile.y);
        ctx.stroke();
        ctx.fillStyle = "#e9fff8";
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.style === "phase" ? 3.4 : 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const particle of game.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.spark) {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.size * 0.45;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.025, particle.y - particle.vy * 0.025);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (0.35 + alpha * 0.65), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawRings() {
    for (const ring of game.rings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.save();
      ctx.strokeStyle = colorAlpha(ring.color, alpha * 0.75);
      ctx.lineWidth = Math.max(0.5, alpha * 2);
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 8 * alpha;
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y, ring.radius, ring.radius * 0.56, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "600 11px Bahnschrift, Microsoft YaHei UI, sans-serif";
    for (const text of game.texts) {
      ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.fillStyle = text.color;
      ctx.shadowColor = text.color;
      ctx.shadowBlur = 7;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.restore();
  }

  function renderSelectionBox() {
    const box = input.selectionBox;
    if (!box || box.width < 3 || box.height < 3) return;
    ctx.save();
    ctx.fillStyle = "rgba(91, 240, 202, .07)";
    ctx.strokeStyle = "rgba(118, 254, 218, .75)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
    ctx.setLineDash([]);
    const corner = 10;
    ctx.strokeStyle = "rgba(187, 255, 235, .9)";
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + corner);
    ctx.lineTo(box.x, box.y);
    ctx.lineTo(box.x + corner, box.y);
    ctx.moveTo(box.x + box.width - corner, box.y);
    ctx.lineTo(box.x + box.width, box.y);
    ctx.lineTo(box.x + box.width, box.y + corner);
    ctx.moveTo(box.x, box.y + box.height - corner);
    ctx.lineTo(box.x, box.y + box.height);
    ctx.lineTo(box.x + corner, box.y + box.height);
    ctx.moveTo(box.x + box.width - corner, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height - corner);
    ctx.stroke();
    ctx.restore();
  }

  function render(now) {
    const time = now * 0.001;
    const shakeX = (Math.random() - 0.5) * game.shake;
    const shakeY = (Math.random() - 0.5) * game.shake;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#06100e";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.save();
    ctx.translate(cssWidth / 2 + shakeX, cssHeight / 2 + shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);
    renderAmbientMotes();

    // The central route gets an almost invisible moving stream of energy.
    ctx.save();
    ctx.strokeStyle = `rgba(135, 232, 198, ${0.03 + Math.sin(time * 0.5) * 0.01})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 34]);
    ctx.lineDashOffset = -time * 21;
    ctx.beginPath();
    ctx.moveTo(435, 1370);
    ctx.bezierCurveTo(950, 1190, 1280, 1260, 1590, 990);
    ctx.bezierCurveTo(1900, 720, 2190, 770, 2600, 525);
    ctx.stroke();
    ctx.restore();

    game.wrecks.forEach(drawWreck);
    drawRings();
    drawMiningBeams();

    const drawables = [
      ...game.resources.filter((entity) => !entity.dead),
      ...game.buildings.filter((entity) => !entity.dead),
      ...game.units.filter((entity) => !entity.dead),
    ].sort((a, b) => {
      const yA = a.y + (a.category === "building" ? a.radius * 0.18 : 0);
      const yB = b.y + (b.category === "building" ? b.radius * 0.18 : 0);
      return yA - yB;
    });

    for (const entity of drawables) {
      if (entity.category === "unit") drawUnit(entity);
      else if (entity.category === "resource") drawResource(entity);
      else if (entity.kind === "core" || entity.kind === "enemyCore") drawCore(entity);
      else if (entity.kind === "barracks") drawBarracks(entity);
      else if (entity.kind === "habitat") drawHabitat(entity);
      else if (entity.kind === "turret") drawTurret(entity);
    }

    drawProjectiles();
    drawParticles();
    drawFloatingTexts();
    drawPlacementGhost();
    ctx.restore();

    renderSelectionBox();

    if (game.pendingAttackMove) {
      const t = performance.now() * 0.004;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 126, 104, .55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(input.mouse.x, input.mouse.y, 16 + Math.sin(t) * 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderMinimap() {
    if (!minimapTerrain || !minimapCtx) return;
    const width = minimapCanvas.width;
    const height = minimapCanvas.height;
    minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
    minimapCtx.clearRect(0, 0, width, height);
    minimapCtx.drawImage(minimapTerrain, 0, 0, width, height);

    const sx = width / WORLD.width;
    const sy = height / WORLD.height;
    minimapCtx.save();
    minimapCtx.fillStyle = "rgba(177, 227, 208, .12)";
    for (let x = 32; x < width; x += 33) minimapCtx.fillRect(x, 0, 1, height);
    for (let y = 18; y < height; y += 28) minimapCtx.fillRect(0, y, width, 1);
    minimapCtx.restore();

    for (const node of game.resources) {
      if (node.dead) continue;
      minimapCtx.fillStyle = "rgba(112, 245, 211, .72)";
      minimapCtx.fillRect(node.x * sx - 1.5, node.y * sy - 1.5, 3, 3);
    }
    for (const building of game.buildings) {
      if (building.dead) continue;
      minimapCtx.fillStyle = building.selected ? "#d8fff3" : teamColor(building.team);
      const size = building.kind === "core" || building.kind === "enemyCore" ? 5 : 3;
      minimapCtx.fillRect(building.x * sx - size / 2, building.y * sy - size / 2, size, size);
    }
    for (const unit of game.units) {
      if (unit.dead) continue;
      minimapCtx.fillStyle = unit.selected ? "#dcfff5" : teamColor(unit.team);
      const size = unit.selected ? 2.4 : 1.6;
      minimapCtx.fillRect(unit.x * sx - size / 2, unit.y * sy - size / 2, size, size);
    }

    const viewWidth = cssWidth / camera.zoom;
    const viewHeight = cssHeight / camera.zoom;
    const left = clamp((camera.x - viewWidth / 2) * sx, 0, width);
    const top = clamp((camera.y - viewHeight / 2) * sy, 0, height);
    const right = clamp((camera.x + viewWidth / 2) * sx, 0, width);
    const bottom = clamp((camera.y + viewHeight / 2) * sy, 0, height);
    minimapCtx.strokeStyle = "rgba(202, 255, 238, .68)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(left + 0.5, top + 0.5, Math.max(3, right - left), Math.max(3, bottom - top));
    minimapCtx.strokeStyle = "rgba(2, 10, 8, .7)";
    minimapCtx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }

  // ------------------------------------------------------------
  // UI, feedback, and command card
  // ------------------------------------------------------------

  function updateHud(force = false) {
    const supplyUsed = calculateSupply(PLAYER);
    const supplyCap = calculateSupplyCap(PLAYER);
    const primary = getPrimary();
    const combatUnits = game.units.filter((unit) =>
      unit.team === PLAYER &&
      !unit.dead &&
      (unit.kind === "ranger" || unit.kind === "guard")
    ).length;
    game.objectives.army = combatUnits >= 6;
    const barracksAlive = game.buildings.some((building) =>
      building.team === PLAYER &&
      building.kind === "barracks" &&
      !building.dead &&
      !building.underConstruction
    );
    if (barracksAlive) game.objectives.barracks = true;

    ui.crystal.textContent = String(Math.floor(game.crystals));
    ui.supply.textContent = String(supplyUsed);
    ui.supplyCap.textContent = String(supplyCap);
    ui.time.textContent = formatTime(game.elapsed);
    const incomeRate = game.elapsed > 1
      ? Math.round(game.income * (60 / Math.min(60, game.elapsed)))
      : 0;
    ui.income.textContent = `+${incomeRate}/min`;
    ui.wave.textContent = formatTime(game.nextWave);
    ui.zoomValue.textContent = `${Math.round(camera.zoom * 100)}%`;

    const interval = getDifficulty().waveInterval;
    const progress = clamp(1 - game.nextWave / interval, 0, 1);
    const activeBars = game.nextWave <= 8 ? 6 : clamp(Math.ceil(progress * 6), 1, 5);
    [...ui.threatBars.children].forEach((bar, index) => {
      bar.classList.toggle("is-active", index < activeBars);
      bar.classList.toggle("is-danger", game.nextWave <= 9 && index < activeBars);
    });
    ui.threatLabel.textContent = game.nextWave <= 9 ? "迫近" : game.nextWave <= 20 ? "警戒" : "低";
    ui.threatLabel.style.color = game.nextWave <= 9 ? "#ff7866" : game.nextWave <= 20 ? "#d6b978" : "#78a494";

    const objectives = {
      barracks: { current: barracksAlive ? 1 : 0, total: 1 },
      army: { current: Math.min(6, combatUnits), total: 6 },
      core: { current: game.objectives.core ? 1 : 0, total: 1 },
    };
    let activeObjective = "barracks";
    if (barracksAlive) activeObjective = game.objectives.army ? "core" : "army";
    $$(".objective").forEach((row) => {
      const key = row.dataset.objective;
      const data = objectives[key];
      const completed = game.objectives[key] || (key === "barracks" && barracksAlive) || data.current >= data.total;
      row.classList.toggle("is-complete", completed);
      row.classList.toggle("is-active", key === activeObjective && !completed);
      row.querySelector("em").textContent = `${data.current}/${data.total}`;
    });
    ui.missionTitle.textContent = game.objectives.army
      ? "摧毁腐化母巢"
      : barracksAlive ? "集结反击部队" : "建立前线节点";

    const queueSignature = primary?.category === "building"
      ? `${primary.queue.join(",")}-${Math.floor(primary.queueProgress * 5)}`
      : "";
    const signature = [
      primary?.id ?? "none",
      game.selected.map((entity) => entity.id).join(","),
      Math.floor(game.crystals),
      supplyUsed,
      supplyCap,
      game.pendingAttackMove,
      game.placement?.kind ?? "",
      primary ? Math.ceil((primary.hp / primary.maxHp) * 20) : "",
      primary?.underConstruction ? Math.floor(primary.progress * 20) : "",
      queueSignature,
      primary?.kind ?? "",
    ].join("|");

    if (force || signature !== uiSignature) {
      uiSignature = signature;
      rebuildSelectionPanel(primary);
    }

    const runtimeState = game.ended ? (game.outcome || "ended") : game.started ? (game.paused ? "paused" : "playing") : "menu";
    document.body.dataset.gameState = runtimeState;
    document.body.dataset.elapsed = game.elapsed.toFixed(1);
    document.body.dataset.crystals = String(Math.floor(game.crystals));
    document.body.dataset.supply = `${supplyUsed}/${supplyCap}`;
    document.body.dataset.army = String(combatUnits);
    document.body.dataset.workers = String(game.units.filter((unit) =>
      unit.team === PLAYER && unit.kind === "worker" && !unit.dead
    ).length);
    document.body.dataset.kills = String(game.kills);
    document.body.dataset.enemyCoreHp = String(Math.max(0, Math.ceil(getEnemyCore()?.hp || 0)));
    document.body.dataset.playerCoreHp = String(Math.max(0, Math.ceil(getPlayerCore()?.hp || 0)));

    const atCapacity = supplyCap > 0 && supplyUsed >= supplyCap;
    if (atCapacity && !game.objectives.army) {
      $("#selectionStatLabel").style.color = "#ff9b81";
    } else {
      $("#selectionStatLabel").style.color = "";
    }
  }

  function rebuildSelectionPanel(primary) {
    const ownSelection = game.selected.filter((entity) => entity.team === PLAYER);
    const selectedCount = ownSelection.length || game.selected.length;

    if (!primary) {
      ui.selectionPortrait.innerHTML = ICONS.core;
      ui.selectionPortrait.style.color = "rgba(110, 155, 140, .42)";
      ui.selectionName.textContent = "战术链路待命";
      ui.selectionRole.textContent = "选择单位或建筑查看可用指令";
      ui.selectionTier.textContent = "—";
      ui.selectionHealth.style.width = "0%";
      ui.selectionHp.textContent = "—";
      ui.selectionStatLabel.firstChild.textContent = "编制 ";
      ui.selectionStat.textContent = `${calculateSupply(PLAYER)} / ${calculateSupplyCap(PLAYER)}`;
      ui.selectionCount.textContent = "00";
      ui.selectionList.innerHTML = `<div class="command-empty" style="grid-column:1/-1;min-height:99px;font-size:7px;text-align:center">未选择作战单位</div>`;
      ui.commandHint.textContent = "选择单位或建筑以查看可用指令";
      ui.commandGrid.innerHTML = `<div class="command-empty">左键选择单位 · 拖动可框选</div>`;
      return;
    }

    const isPlayer = primary.team === PLAYER;
    const def = primary.category === "unit" ? UNIT_DEFS[primary.kind] : BUILDING_DEFS[primary.kind];
    const icon = ICONS[primary.kind] || ICONS.crystal;
    ui.selectionPortrait.innerHTML = icon;
    ui.selectionPortrait.style.color = teamColor(primary.team);
    ui.selectionName.textContent = primary.name;
    ui.selectionRole.textContent = primary.role || def?.role || "中立目标";
    ui.selectionTier.textContent = def?.tier || "—";
    const hpRatio = clamp(primary.hp / primary.maxHp, 0, 1);
    ui.selectionHealth.style.width = `${hpRatio * 100}%`;
    ui.selectionHealth.style.background = hpRatio < 0.35 ? "#f0ad63" : teamColor(primary.team);
    ui.selectionHp.textContent = `${Math.ceil(primary.hp)} / ${primary.maxHp}`;
    ui.selectionStatLabel.firstChild.textContent = `${def?.statLabel || "状态"} `;
    if (primary.underConstruction) {
      ui.selectionStat.textContent = `${Math.round(primary.progress * 100)}%`;
    } else if (primary.category === "unit" && primary.kind === "worker") {
      ui.selectionStat.textContent = String(primary.carry || 0);
    } else if (primary.category === "building" && primary.queue.length) {
      ui.selectionStat.textContent = `队列 ${primary.queue.length}`;
    } else {
      ui.selectionStat.textContent = String(def?.stat ?? "—");
    }
    ui.selectionCount.textContent = String(selectedCount).padStart(2, "0");

    if (game.selected.length) {
      ui.selectionList.innerHTML = game.selected.slice(0, 16).map((entity, index) => {
        const entityDef = entity.category === "unit" ? UNIT_DEFS[entity.kind] : BUILDING_DEFS[entity.kind];
        const iconMarkup = ICONS[entity.kind] || ICONS.crystal;
        return `
          <button class="unit-token ${entity.id === game.primaryId ? "is-primary" : ""}" type="button"
            data-entity-id="${entity.id}" title="${entity.name}" aria-label="${entity.name}">
            <span class="token-index">${String(index + 1).padStart(2, "0")}</span>
            <span style="display:block;width:100%;height:100%;color:${teamColor(entity.team)}">${iconMarkup}</span>
            <span class="token-health"><i style="width:${clamp(entity.hp / entity.maxHp, 0, 1) * 100}%"></i></span>
          </button>
        `;
      }).join("");
    } else {
      ui.selectionList.innerHTML = `<div class="command-empty" style="grid-column:1/-1;min-height:99px;font-size:7px">无作战编组</div>`;
    }

    const commands = isPlayer ? getAvailableCommands(primary) : [];
    if (!commands.length) {
      ui.commandHint.textContent = isPlayer ? "当前目标没有可调用指令" : "中立 / 敌方目标仅可观察";
      ui.commandGrid.innerHTML = `<div class="command-empty">${primary.underConstruction ? "建筑正在施工 · 选择拓荒者继续建造" : "无可执行指令"}</div>`;
      return;
    }

    if (primary.category === "building" && primary.queue.length) {
      const queueKind = UNIT_DEFS[primary.queue[0]];
      ui.commandHint.textContent = `队列 ${primary.queue.length}/5 · ${queueKind.name} ${Math.round(primary.queueProgress / queueKind.buildTime * 100)}%`;
    } else if (primary.kind === "worker") {
      ui.commandHint.textContent = "B 兵营 · H 栖息舱 · T 炮塔 · E 采集";
    } else if (primary.category === "unit") {
      ui.commandHint.textContent = "Q 攻击移动 · S 停止 · H 坚守";
    } else {
      ui.commandHint.textContent = "右键设置集结点 · 点击指令生产";
    }

    ui.commandGrid.innerHTML = commands.map((command) => {
      const queueCount = command.trainKind && primary.queue
        ? primary.queue.filter((kind) => kind === command.trainKind).length
        : 0;
      const active = command.id === "attackmove" && game.pendingAttackMove;
      return `
        <button class="command-button ${active ? "is-active" : ""}" type="button"
          data-command="${command.id}" data-tip="${escapeAttribute(command.description)}"
          ${command.disabled ? "disabled" : ""} aria-label="${command.label}">
          <span class="hotkey">${command.hotkey || ""}</span>
          <span class="cmd-icon">${COMMAND_ICONS[command.icon] || COMMAND_ICONS.stop}</span>
          <span class="cmd-copy"><b>${command.label}</b><small>${command.meta || ""}</small></span>
          ${queueCount ? `<span class="queue-badge">${queueCount}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function getAvailableCommands(primary) {
    if (!primary || primary.team !== PLAYER) return [];
    const commands = [];
    const supplyUsed = calculateSupply(PLAYER);
    const supplyCap = calculateSupplyCap(PLAYER);

    if (primary.category === "unit") {
      const hasCombat = game.selected.some((entity) =>
        entity.category === "unit" && entity.team === PLAYER && entity.kind !== "worker"
      );
      commands.push({
        id: "attackmove",
        label: "攻击移动",
        hotkey: "Q",
        icon: "attackmove",
        meta: "沿途索敌",
        description: "单位移动到目标区域，并自动攻击路线上发现的所有敌人。",
        disabled: false,
      });
      commands.push({
        id: "stop",
        label: "停止",
        hotkey: "S",
        icon: "stop",
        meta: "中断行动",
        description: "中断当前移动、采集或攻击行动，单位将留在原地。",
      });
      if (primary.kind === "worker") {
        commands.push({
          id: "gather",
          label: "自动采集",
          hotkey: "E",
          icon: "gather",
          meta: "最近晶矿",
          description: "让所有选中的拓荒者前往最近的晶体矿脉，并自动往返交付。",
        });
        commands.push({
          id: "build:barracks",
          label: "折跃兵营",
          hotkey: "B",
          icon: "barracks",
          meta: "200 晶能",
          description: "训练长弓手与重装守卫。需要选择至少一名拓荒者。",
          disabled: game.crystals < BUILDING_DEFS.barracks.cost,
        });
        commands.push({
          id: "build:habitat",
          label: "生态栖息舱",
          hotkey: "H",
          icon: "habitat",
          meta: "110 晶能",
          description: "完成后永久提升 6 点舰队编制。人口接近上限时尽早部署。",
          disabled: game.crystals < BUILDING_DEFS.habitat.cost,
        });
        commands.push({
          id: "build:turret",
          label: "相位炮塔",
          hotkey: "T",
          icon: "turret",
          meta: "150 晶能",
          description: "自动索敌的防御建筑，适合保护采集路线与基地侧翼。",
          disabled: game.crystals < BUILDING_DEFS.turret.cost,
        });
      } else {
        commands.push({
          id: "hold",
          label: "坚守阵地",
          hotkey: "H",
          icon: "hold",
          meta: "原地警戒",
          description: "单位不会追击目标，只攻击射程内的敌人。适合守住狭窄通道。",
        });
      }
      return commands;
    }

    if (primary.category === "building" && !primary.underConstruction) {
      if (primary.kind === "core") {
        commands.push(makeTrainCommand("worker", "训练拓荒者", "Z", 328));
      } else if (primary.kind === "barracks") {
        commands.push(makeTrainCommand("ranger", "长弓手", "R", 234));
        commands.push(makeTrainCommand("guard", "重装守卫", "G", 390));
      }
    }

    function makeTrainCommand(kind, label, hotkey, shortcutCode) {
      const def = UNIT_DEFS[kind];
      const queued = calculateQueuedSupply(PLAYER);
      const queueFull = primary.queue.length >= 5;
      const enoughSupply = supplyUsed + queued + def.supply <= supplyCap;
      let reason = "";
      if (game.crystals < def.cost) reason = `晶能不足 · 需要 ${def.cost}`;
      else if (!enoughSupply) reason = `编制不足 · 需要 ${def.supply} 点编制`;
      else if (queueFull) reason = "生产队列已满";
      return {
        id: `train:${kind}`,
        trainKind: kind,
        label,
        hotkey,
        icon: kind,
        meta: `${def.cost} 晶能 · ${def.supply}编制`,
        description: reason || `花费 ${def.cost} 晶能训练${def.name}。用时 ${def.buildTime} 秒，占用 ${def.supply} 点编制。`,
        disabled: Boolean(reason),
        shortcutCode,
      };
    }
    return commands;
  }

  function performCommand(commandId) {
    const primary = getPrimary();
    if (!primary || primary.team !== PLAYER || game.paused || game.ended) return;

    if (commandId === "attackmove") {
      setPendingAttackMove();
      return;
    }
    if (commandId === "stop") {
      game.selected
        .filter((entity) => entity.category === "unit" && entity.team === PLAYER)
        .forEach((unit) => {
          unit.order = null;
          unit.targetId = null;
          unit.mining = false;
          unit.moving = false;
        });
      playSound("command");
      toast("作战单位已停止行动", "default", 1500);
      uiSignature = "";
      return;
    }
    if (commandId === "hold") {
      game.selected
        .filter((entity) => entity.category === "unit" && entity.team === PLAYER && entity.kind !== "worker")
        .forEach((unit) => {
          unit.order = { type: "hold" };
          unit.targetId = null;
          unit.moving = false;
        });
      playSound("command");
      toast("单位进入坚守状态", "default", 1500);
      uiSignature = "";
      return;
    }
    if (commandId === "gather") {
      const workers = game.selected.filter((entity) =>
        entity.category === "unit" && entity.team === PLAYER && entity.kind === "worker"
      );
      workers.forEach((worker) => {
        const node = nearestResource(worker);
        if (node) issueGather(worker, node);
      });
      playSound("order");
      const markerNode = nearestResource(primary);
      if (markerNode) createTargetMarker(markerNode.x, markerNode.y, "#7bf6d5");
      updateTip("拓荒者会自动寻找最近的晶体矿脉，往返采集无需重复指令。");
      uiSignature = "";
      return;
    }
    if (commandId.startsWith("build:")) {
      setPlacement(commandId.split(":")[1]);
      return;
    }
    if (commandId.startsWith("train:")) {
      const kind = commandId.split(":")[1];
      queueUnit(primary, kind);
    }
  }

  function queueUnit(building, kind) {
    if (!building || building.team !== PLAYER || building.underConstruction || building.dead) return;
    const def = UNIT_DEFS[kind];
    if (!def) return;
    if (building.queue.length >= 5) {
      toast("生产队列已满", "warning");
      playSound("error");
      return;
    }
    const expectedSource = def.source === "core" ? "core" : "barracks";
    if (building.kind !== expectedSource) {
      toast("该建筑无法生产此单位", "warning");
      playSound("error");
      return;
    }
    if (calculateSupply(PLAYER) + calculateQueuedSupply(PLAYER) + def.supply > calculateSupplyCap(PLAYER)) {
      toast("舰队编制不足，请建造生态栖息舱", "warning", 3000);
      playSound("error");
      return;
    }
    if (!spendCrystals(def.cost)) {
      toast(`晶能不足 · 还需要 ${def.cost - game.crystals}`, "warning");
      playSound("error");
      return;
    }
    building.queue.push(kind);
    playSound("queue");
    toast(`${def.name}已加入生产队列`, "default", 1700);
    updateHud(true);
  }

  function toast(message, type = "default", duration = 2800) {
    if (!ui.toastStack) return;
    const element = document.createElement("div");
    element.className = `toast ${type !== "default" ? `is-${type}` : ""}`;
    element.textContent = message;
    ui.toastStack.appendChild(element);
    while (ui.toastStack.children.length > 4) ui.toastStack.firstElementChild.remove();
    window.setTimeout(() => element.classList.add("is-out"), duration);
    window.setTimeout(() => element.remove(), duration + 320);
  }

  function updateTip(message, autoDismiss = false) {
    if (!ui.tipText) return;
    ui.tipText.textContent = message;
    ui.tipRail.style.display = game.tipDismissed ? "none" : "flex";
    if (autoDismiss) {
      clearTimeout(updateTip.timer);
      updateTip.timer = setTimeout(() => {
        ui.tipRail.style.display = "none";
      }, 7200);
    }
  }

  function createParticles(x, y, color, count = 8, speed = 70, life = 0.7) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.25 + Math.random() * 0.75);
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity * 0.7 - 12,
        gravity: 22 + Math.random() * 30,
        size: 0.8 + Math.random() * 2.2,
        color,
        life: life * (0.55 + Math.random() * 0.65),
        maxLife: life,
        spark: Math.random() < 0.58,
      });
    }
  }

  function createRing(x, y, startRadius, maxRadius, color, life = 0.6) {
    game.rings.push({
      x,
      y,
      radius: startRadius,
      maxRadius,
      color,
      life,
      maxLife: life,
    });
  }

  function createFloatingText(x, y, text, color) {
    game.texts.push({
      x,
      y,
      text,
      color,
      life: 1.25,
      maxLife: 1.25,
    });
  }

  function createTargetMarker(x, y, color) {
    createRing(x, y, 5, 29, color, 0.55);
    game.texts.push({
      x,
      y: y - 11,
      text: "◆",
      color,
      life: 0.55,
      maxLife: 0.55,
    });
  }

  function createSlash(x, y, angle, color) {
    for (let i = 0; i < 7; i += 1) {
      const a = angle - 0.7 + i * 0.22;
      game.particles.push({
        x: x + Math.cos(a) * 24,
        y: y + Math.sin(a) * 24,
        vx: Math.cos(a + 0.5) * 60,
        vy: Math.sin(a + 0.5) * 60,
        gravity: 0,
        size: 1.6,
        color,
        life: 0.22,
        maxLife: 0.22,
        spark: true,
      });
    }
  }

  // ------------------------------------------------------------
  // Audio: small procedural soundscape, no external assets.
  // ------------------------------------------------------------

  function ensureAudio() {
    if (audioContext) {
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      return audioContext;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      audioContext = new AudioContextClass();
    } catch {
      audioContext = null;
    }
    return audioContext;
  }

  function playTone(frequency, duration, type = "sine", volume = 0.03, slide = 0, delay = 0) {
    if (game.muted) return;
    const audio = ensureAudio();
    if (!audio) return;
    try {
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch {
      // Audio is optional; gameplay remains active if the browser blocks it.
    }
  }

  function playNoise(duration = 0.25, volume = 0.07) {
    if (game.muted) return;
    const audio = ensureAudio();
    if (!audio) return;
    try {
      const sampleCount = Math.floor(audio.sampleRate * duration);
      const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount) ** 2;
      }
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      filter.type = "lowpass";
      filter.frequency.value = 720;
      gain.gain.value = volume;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start();
    } catch {
      // Ignore optional audio errors.
    }
  }

  function playSound(name) {
    if (game.muted) return;
    switch (name) {
      case "select":
        playTone(480, 0.045, "sine", 0.018, 80);
        break;
      case "command":
        playTone(310, 0.07, "triangle", 0.022, -80);
        break;
      case "order":
        playTone(520, 0.05, "triangle", 0.026, 140);
        playTone(690, 0.045, "sine", 0.014, 70, 0.04);
        break;
      case "mode":
        playTone(245, 0.1, "triangle", 0.025, 110);
        break;
      case "cancel":
        playTone(340, 0.08, "triangle", 0.022, -100);
        break;
      case "place":
        playTone(190, 0.2, "sine", 0.045, -60);
        playTone(520, 0.12, "triangle", 0.02, 120, 0.04);
        break;
      case "complete":
        [392, 523, 659].forEach((freq, i) => playTone(freq, 0.38, "sine", 0.026, 8, i * 0.08));
        break;
      case "queue":
        playTone(605, 0.06, "triangle", 0.024, 70);
        break;
      case "deposit":
        playTone(760, 0.05, "sine", 0.012, 90);
        break;
      case "shot":
        playTone(840 + Math.random() * 180, 0.055, "sawtooth", 0.018, -420);
        break;
      case "beam":
        playTone(320, 0.11, "sawtooth", 0.016, 570);
        break;
      case "kill":
        playTone(110, 0.12, "sawtooth", 0.024, -40);
        break;
      case "explosion":
        playNoise(0.46, 0.11);
        playTone(74, 0.44, "sawtooth", 0.055, -30);
        break;
      case "spawn":
        playTone(280, 0.15, "sine", 0.018, 220);
        break;
      case "alert":
        playTone(205, 0.22, "triangle", 0.028, 20);
        playTone(205, 0.22, "triangle", 0.028, 20, 0.29);
        break;
      case "warning":
        playTone(132, 0.28, "sawtooth", 0.024, -20);
        break;
      case "error":
        playTone(170, 0.09, "square", 0.016, -35);
        break;
      case "deploy":
        [196, 294, 392, 587].forEach((freq, i) => playTone(freq, 0.55, "sine", 0.024, 3, i * 0.08));
        break;
      case "victory":
        [262, 330, 392, 523, 659].forEach((freq, i) => playTone(freq, 0.7, "triangle", 0.027, 2, i * 0.13));
        break;
      case "defeat":
        [196, 165, 131].forEach((freq, i) => playTone(freq, 0.8, "sine", 0.03, -10, i * 0.22));
        break;
      default:
        break;
    }
  }

  function startAmbient() {
    if (ambientNodes.length || game.muted) return;
    const audio = ensureAudio();
    if (!audio) return;
    const gain = audio.createGain();
    gain.gain.value = 0.013;
    gain.connect(audio.destination);
    [55, 82.5].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      filter.type = "lowpass";
      filter.frequency.value = 180;
      oscillator.connect(filter);
      filter.connect(gain);
      oscillator.start();
      ambientNodes.push(oscillator);
    });
    ambientNodes.push(gain);
  }

  function stopAmbient() {
    ambientNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        else if (typeof node.disconnect === "function") node.disconnect();
      } catch {
        // Nodes may already be disconnected.
      }
    });
    ambientNodes = [];
  }

  function toggleSound() {
    game.muted = !game.muted;
    ui.soundButton.classList.toggle("is-muted", game.muted);
    if (game.muted) stopAmbient();
    else {
      ensureAudio();
      if (game.started) startAmbient();
      playSound("command");
    }
    toast(game.muted ? "声音已关闭" : "声音已开启", "default", 1400);
  }

  // ------------------------------------------------------------
  // Input and camera controls
  // ------------------------------------------------------------

  function resizeCanvas() {
    cssWidth = window.innerWidth;
    cssHeight = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    updateCameraClamp();
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = clamp(event.clientX - rect.left, 0, rect.width);
    input.mouse.y = clamp(event.clientY - rect.top, 0, rect.height);
    input.mouse.inside = true;
    refreshPointerWorld();
  }

  function refreshPointerWorld() {
    const world = screenToWorld(input.mouse.x, input.mouse.y);
    input.mouse.worldX = world.x;
    input.mouse.worldY = world.y;
  }

  function updateInputCursor() {
    if (!game.started) {
      canvas.style.cursor = "default";
      return;
    }
    if (game.paused || game.ended) {
      canvas.style.cursor = "default";
      return;
    }
    const hovered = pickEntityAt(input.mouse.x, input.mouse.y);
    input.hoverId = hovered?.id ?? null;
    if (game.placement || game.pendingAttackMove) canvas.style.cursor = "crosshair";
    else if (hovered?.team === ENEMY) canvas.style.cursor = "crosshair";
    else if (hovered?.category === "resource") canvas.style.cursor = "pointer";
    else if (hovered?.team === PLAYER) canvas.style.cursor = "pointer";
    else canvas.style.cursor = "crosshair";
  }

  function updateCamera(dt) {
    if (!game.started || game.paused) return;
    let dx = 0;
    let dy = 0;
    const keyboardSpeed = 570 / camera.zoom;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) dy -= keyboardSpeed * dt;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) dy += keyboardSpeed * dt;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) dx -= keyboardSpeed * dt;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) dx += keyboardSpeed * dt;

    if (input.mouse.inside && !input.mouse.down) {
      const edge = 18;
      const edgeSpeed = 430 / camera.zoom;
      if (input.mouse.x < edge) dx -= edgeSpeed * dt;
      if (input.mouse.x > cssWidth - edge) dx += edgeSpeed * dt;
      if (input.mouse.y < edge) dy -= edgeSpeed * dt;
      if (input.mouse.y > cssHeight - edge) dy += edgeSpeed * dt;
    }

    if (dx || dy) {
      camera.x += dx;
      camera.y += dy;
      updateCameraClamp();
      refreshPointerWorld();
    }
    if (game.placement) {
      game.placement.x = input.mouse.worldX;
      game.placement.y = input.mouse.worldY;
      game.placement.valid = canPlaceBuilding(game.placement.kind, game.placement.x, game.placement.y);
    }
  }

  function handleAttackMoveConfirm(screenX, screenY) {
    const target = pickEntityAt(screenX, screenY, true);
    const units = game.selected.filter((entity) =>
      entity.category === "unit" && entity.team === PLAYER && !entity.dead
    );
    const point = screenToWorld(screenX, screenY);
    if (target && target.team !== PLAYER && target.team !== NEUTRAL) {
      units.forEach((unit) => issueAttack(unit, target));
      createTargetMarker(target.x, target.y, "#ff8a76");
    } else {
      issueGroupMove(units, point.x, point.y, "attackmove");
      createTargetMarker(point.x, point.y, "#ff8a76");
    }
    game.pendingAttackMove = false;
    game.inputMode = "normal";
    canvas.style.cursor = "crosshair";
    playSound("order");
    uiSignature = "";
    updateHud(true);
  }

  function boxSelect(box, additive) {
    const minX = Math.min(box.x, box.x + box.width);
    const maxX = Math.max(box.x, box.x + box.width);
    const minY = Math.min(box.y, box.y + box.height);
    const maxY = Math.max(box.y, box.y + box.height);
    const selected = game.units.filter((unit) => {
      if (unit.dead || unit.team !== PLAYER) return false;
      const screen = worldToScreen(unit.x, unit.y);
      return screen.x >= minX && screen.x <= maxX && screen.y >= minY && screen.y <= maxY;
    });
    if (selected.length) selectEntities(selected, additive);
    else if (!additive) clearSelection();
  }

  function handleCanvasPointerDown(event) {
    updatePointerFromEvent(event);
    if (!game.started || game.paused || game.ended) return;

    if (event.button === 2) {
      event.preventDefault();
      if (game.placement) {
        cancelPlacement();
        return;
      }
      if (game.pendingAttackMove) {
        game.pendingAttackMove = false;
        game.inputMode = "normal";
        uiSignature = "";
        updateHud(true);
      }
      const target = pickEntityAt(input.mouse.x, input.mouse.y, true);
      const point = screenToWorld(input.mouse.x, input.mouse.y);
      commandForOrder(target, target ? { x: target.x, y: target.y } : point);
      return;
    }

    if (event.button !== 0) return;
    if (game.placement) {
      game.placement.x = input.mouse.worldX;
      game.placement.y = input.mouse.worldY;
      game.placement.valid = canPlaceBuilding(game.placement.kind, game.placement.x, game.placement.y);
      confirmPlacement();
      return;
    }
    if (game.pendingAttackMove) {
      handleAttackMoveConfirm(input.mouse.x, input.mouse.y);
      return;
    }
    input.mouse.down = true;
    input.mouse.button = 0;
    input.dragStart = {
      x: input.mouse.x,
      y: input.mouse.y,
      shift: event.shiftKey,
    };
    input.selectionBox = null;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handleCanvasPointerMove(event) {
    updatePointerFromEvent(event);
    if (!input.mouse.down || !input.dragStart || game.paused) return;
    const dx = input.mouse.x - input.dragStart.x;
    const dy = input.mouse.y - input.dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      input.selectionBox = {
        x: input.dragStart.x,
        y: input.dragStart.y,
        width: dx,
        height: dy,
        additive: input.dragStart.shift,
      };
    }
    if (game.placement) {
      game.placement.x = input.mouse.worldX;
      game.placement.y = input.mouse.worldY;
      game.placement.valid = canPlaceBuilding(game.placement.kind, game.placement.x, game.placement.y);
    }
  }

  function handleCanvasPointerUp(event) {
    if (!input.mouse.down) return;
    updatePointerFromEvent(event);
    input.mouse.down = false;
    canvas.releasePointerCapture?.(event.pointerId);

    const box = input.selectionBox;
    input.selectionBox = null;
    const dragDistance = input.dragStart
      ? Math.hypot(input.mouse.x - input.dragStart.x, input.mouse.y - input.dragStart.y)
      : 0;
    const additive = input.dragStart?.shift || event.shiftKey;

    if (box && dragDistance >= 7) {
      boxSelect(box, additive);
      input.dragStart = null;
      return;
    }

    const target = pickEntityAt(input.mouse.x, input.mouse.y, true);
    if (!target) {
      if (!additive) clearSelection();
      input.dragStart = null;
      return;
    }

    const now = performance.now();
    const isDoubleClick =
      input.lastClick.id === target.id &&
      input.lastClick.kind === target.kind &&
      now - input.lastClick.at < 320;

    if (isDoubleClick && target.team === PLAYER) {
      const sameKind = game.units.filter((unit) => unit.team === PLAYER && unit.kind === target.kind && !unit.dead);
      selectEntities(sameKind, false);
      input.lastClick = { at: 0, id: null, kind: null };
      input.dragStart = null;
      return;
    }

    if (target.team === PLAYER && additive) {
      if (game.selected.some((entity) => entity.id === target.id)) {
        removeFromSelection(target);
        updateHud(true);
      } else {
        selectEntities([target], true);
      }
    } else if (target.team === PLAYER) {
      selectEntities([target], false);
    } else {
      selectEntities([target], false);
      toast(target.category === "resource" ? `星壤晶体 · 剩余 ${target.amount}` : `${target.name} · 敌对目标`, "default", 1800);
    }

    input.lastClick = { at: now, id: target.id, kind: target.kind };
    input.dragStart = null;
  }

  function handleWheel(event) {
    if (!game.started || game.ended) return;
    event.preventDefault();
    const anchor = screenToWorld(input.mouse.x, input.mouse.y);
    const factor = event.deltaY > 0 ? 0.91 : 1.09;
    camera.zoom = clamp(camera.zoom * factor, camera.minZoom, camera.maxZoom);
    const after = screenToWorld(input.mouse.x, input.mouse.y);
    camera.x += anchor.x - after.x;
    camera.y += anchor.y - after.y;
    updateCameraClamp();
    refreshPointerWorld();
    ui.zoomValue.textContent = `${Math.round(camera.zoom * 100)}%`;
  }

  function centerCameraOn(x, y) {
    camera.x = x;
    camera.y = y;
    updateCameraClamp();
    refreshPointerWorld();
    playSound("select");
  }

  let helpOpen = false;
  let helpWasPaused = false;

  function togglePause(force) {
    if (!game.started || game.ended) return;
    const shouldPause = typeof force === "boolean" ? force : !game.paused;
    if (helpOpen) closeHelp();
    game.paused = shouldPause;
    ui.pauseScreen.classList.toggle("is-hidden", !shouldPause);
    ui.pauseScreen.setAttribute("aria-hidden", String(!shouldPause));
    input.keys.clear();
    playSound(shouldPause ? "cancel" : "command");
  }

  function openHelp() {
    if (!game.started) return;
    if (helpOpen) return;
    helpWasPaused = game.paused;
    game.paused = true;
    helpOpen = true;
    ui.pauseScreen.classList.add("is-hidden");
    ui.pauseScreen.setAttribute("aria-hidden", "true");
    ui.helpScreen.classList.remove("is-hidden");
    ui.helpScreen.setAttribute("aria-hidden", "false");
    input.keys.clear();
  }

  function closeHelp() {
    if (!helpOpen) return;
    helpOpen = false;
    ui.helpScreen.classList.add("is-hidden");
    ui.helpScreen.setAttribute("aria-hidden", "true");
    if (!game.ended) {
      game.paused = helpWasPaused;
      ui.pauseScreen.classList.toggle("is-hidden", !helpWasPaused);
      ui.pauseScreen.setAttribute("aria-hidden", String(!helpWasPaused));
    }
  }

  function restartMission() {
    stopAmbient();
    helpOpen = false;
    ui.helpScreen.classList.add("is-hidden");
    ui.pauseScreen.classList.add("is-hidden");
    ui.endScreen.classList.add("is-hidden");
    resetGame();
    beginGame();
  }

  function saveGroup(number) {
    if (!game.selected.length) return;
    game.groups[number] = game.selected.filter((entity) => !entity.dead).map((entity) => entity.id);
    toast(`作战编组 ${number} 已保存`, "default", 1400);
    playSound("command");
  }

  function recallGroup(number) {
    const ids = game.groups[number];
    if (!ids?.length) return;
    const entities = ids.map(getEntity).filter((entity) => entity && !entity.dead);
    if (!entities.length) {
      delete game.groups[number];
      return;
    }
    selectEntities(entities, false);
    const avgX = entities.reduce((sum, entity) => sum + entity.x, 0) / entities.length;
    const avgY = entities.reduce((sum, entity) => sum + entity.y, 0) / entities.length;
    centerCameraOn(avgX, avgY);
  }

  function handleKeyDown(event) {
    if (!game.started) {
      if (event.code === "Enter" && !ui.startScreen.classList.contains("is-hidden")) {
        beginGame();
      }
      return;
    }

    if (event.code === "F1") {
      event.preventDefault();
      if (helpOpen) closeHelp();
      else openHelp();
      return;
    }
    if (event.code === "Escape") {
      event.preventDefault();
      if (helpOpen) {
        closeHelp();
        return;
      }
      if (game.placement || game.pendingAttackMove) {
        cancelPlacement();
        return;
      }
      if (!$("#pauseScreen").classList.contains("is-hidden")) {
        togglePause(false);
      }
      return;
    }
    if (event.code === "KeyM") {
      event.preventDefault();
      toggleSound();
      return;
    }
    if (event.code === "KeyP" && !event.ctrlKey && !helpOpen) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (helpOpen || game.paused || game.ended) return;

    if (event.ctrlKey && /^Digit[1-9]$/.test(event.code)) {
      event.preventDefault();
      saveGroup(event.code.slice(-1));
      return;
    }
    if (!event.ctrlKey && /^Digit[1-9]$/.test(event.code)) {
      event.preventDefault();
      recallGroup(event.code.slice(-1));
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      const core = getPlayerCore();
      if (core) centerCameraOn(core.x, core.y);
      return;
    }

    const cameraKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (cameraKeys.includes(event.code)) {
      input.keys.add(event.code);
      event.preventDefault();
    }

    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const primary = getPrimary();
    const hasWorkers = game.selected.some((entity) =>
      entity.category === "unit" && entity.team === PLAYER && entity.kind === "worker"
    );
    const hasUnits = game.selected.some((entity) =>
      entity.category === "unit" && entity.team === PLAYER
    );
    const hasCombat = game.selected.some((entity) =>
      entity.category === "unit" && entity.team === PLAYER && entity.kind !== "worker"
    );

    if (event.code === "KeyQ" && hasUnits) {
      event.preventDefault();
      setPendingAttackMove();
    } else if (event.code === "KeyE" && hasWorkers) {
      event.preventDefault();
      performCommand("gather");
    } else if (event.code === "KeyS" && hasUnits) {
      // Any currently selected combat unit stops; this remains available even when selected with workers.
      performCommand("stop");
      input.keys.delete("KeyS");
      event.preventDefault();
    } else if (event.code === "KeyB" && hasWorkers) {
      event.preventDefault();
      setPlacement("barracks");
    } else if (event.code === "KeyH" && hasWorkers) {
      event.preventDefault();
      setPlacement("habitat");
    } else if (event.code === "KeyT" && hasWorkers) {
      event.preventDefault();
      setPlacement("turret");
    } else if (event.code === "KeyH" && hasCombat) {
      event.preventDefault();
      performCommand("hold");
    } else if (primary?.category === "building" && primary.team === PLAYER) {
      if (event.code === "KeyZ" && primary.kind === "core") {
        event.preventDefault();
        queueUnit(primary, "worker");
      } else if (event.code === "KeyR" && primary.kind === "barracks") {
        event.preventDefault();
        queueUnit(primary, "ranger");
      } else if (event.code === "KeyG" && primary.kind === "barracks") {
        event.preventDefault();
        queueUnit(primary, "guard");
      }
    }
  }

  function handleKeyUp(event) {
    input.keys.delete(event.code);
  }

  function setDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    game.difficulty = key;
    const difficulty = getDifficulty();
    $$("#difficultyOptions button").forEach((button) => {
      const selected = button.dataset.difficulty === key;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    ui.difficultyCode.textContent = difficulty.code;
    ui.protocolReward.textContent = difficulty.reward;
    [...ui.pressureBars.children].forEach((bar, index) => {
      bar.classList.toggle("is-on", index < difficulty.pressure);
    });
    game.nextWave = difficulty.firstWave;
    if (!game.started) updateHud(true);
  }

  function bindEvents() {
    canvas.addEventListener("pointerdown", handleCanvasPointerDown);
    canvas.addEventListener("pointermove", handleCanvasPointerMove);
    canvas.addEventListener("pointerup", handleCanvasPointerUp);
    canvas.addEventListener("pointerleave", () => {
      input.mouse.inside = false;
      if (!input.mouse.down) input.hoverId = null;
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => input.keys.clear());
    window.addEventListener("resize", resizeCanvas);

    $("#startButton").addEventListener("click", () => beginGame());
    $$("#difficultyOptions button").forEach((button) => {
      button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
    });
    ui.soundButton.addEventListener("click", toggleSound);
    $("#pauseButton").addEventListener("click", () => togglePause());
    $("#resumeButton").addEventListener("click", () => togglePause(false));
    $("#restartButton").addEventListener("click", restartMission);
    $("#endRestartButton").addEventListener("click", restartMission);
    $("#helpButton").addEventListener("click", () => {
      if (helpOpen) closeHelp();
      else openHelp();
    });
    $("#helpCloseButton").addEventListener("click", closeHelp);
    $("#tipClose").addEventListener("click", () => {
      game.tipDismissed = true;
      ui.tipRail.style.display = "none";
    });
    $("#endCloseButton").addEventListener("click", () => {
      ui.endScreen.classList.add("is-hidden");
      ui.endScreen.setAttribute("aria-hidden", "true");
      game.paused = false; // Camera remains available for inspecting the final battlefield.
    });

    ui.commandGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-command]");
      if (!button || button.disabled) return;
      performCommand(button.dataset.command);
    });
    ui.commandGrid.addEventListener("pointerover", (event) => {
      const button = event.target.closest("[data-command]");
      if (!button) return;
      ui.tooltip.innerHTML = `<b>${button.querySelector(".cmd-copy b")?.textContent || button.getAttribute("aria-label")}</b>${escapeAttribute(button.dataset.tip || "")}`;
      ui.tooltip.classList.add("is-visible");
      ui.tooltip.setAttribute("aria-hidden", "false");
    });
    ui.commandGrid.addEventListener("pointerout", (event) => {
      if (ui.commandGrid.contains(event.relatedTarget)) return;
      ui.tooltip.classList.remove("is-visible");
      ui.tooltip.setAttribute("aria-hidden", "true");
    });
    ui.selectionList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-entity-id]");
      if (!button) return;
      const entity = getEntity(Number(button.dataset.entityId));
      if (!entity || entity.dead) return;
      game.primaryId = entity.id;
      uiSignature = "";
      updateHud(true);
      playSound("select");
    });

    minimapCanvas.addEventListener("pointerdown", (event) => {
      if (!game.started || game.paused) return;
      event.preventDefault();
      const rect = minimapCanvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * minimapCanvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * minimapCanvas.height;
      const worldX = (x / minimapCanvas.width) * WORLD.width;
      const worldY = (y / minimapCanvas.height) * WORLD.height;
      if (event.button === 2) {
        const units = game.selected.filter((entity) =>
          entity.category === "unit" && entity.team === PLAYER && !entity.dead
        );
        if (units.length) {
          issueGroupMove(units, worldX, worldY, "attackmove");
          createTargetMarker(worldX, worldY, "#ff8a76");
          playSound("order");
        }
      } else {
        centerCameraOn(worldX, worldY);
      }
    });
    minimapCanvas.addEventListener("contextmenu", (event) => event.preventDefault());

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.started && !game.paused && !game.ended) togglePause(true);
    });
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    updateCamera(dt);
    updateGame(dt);
    render(now);
    requestAnimationFrame(frame);
  }

  function init() {
    resizeCanvas();
    bindEvents();
    setDifficulty("veteran");
    resetGame();
    updateCameraClamp();
    updateHud(true);
    requestAnimationFrame(frame);
  }

  window.AetherFront = {
    game,
    camera,
    beginGame,
    resetGame,
    spawnWave,
    getPlayerCore,
    getEnemyCore,
  };

  init();
})();



