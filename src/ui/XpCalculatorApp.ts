import { D35EAdapter } from "../d35e-adapter";
import { groupToEL, combineELs } from "../calc/el";
import { awardRaw35, split30, getPot30 } from "../calc/xp";

type ManualAward = {
  amount: number;                    // user-entered value
  unit: "points" | "bubbles";        // how to interpret amount
  reason: string;                    // chat reason
};

function bubbleSizeForLevel(level: number): number {
  // per-level span divided by 13⅓
  const start = (window as any).CONFIG?.D35E
    ? (CONFIG as any).D35E.CHARACTER_EXP_LEVELS[game.settings.get("D35E","experienceRate") as string][Math.max(0, level-1)]
    : 0;
  const next  = (window as any).CONFIG?.D35E
    ? (CONFIG as any).D35E.CHARACTER_EXP_LEVELS[game.settings.get("D35E","experienceRate") as string][Math.max(0, level)]
    : start + 1000; // harmless fallback
  const span = Math.max(1, Number(next) - Number(start));
  return span / (13 + 1/3);
}

function getModSetting<T = any>(key: string, fallback: T): T {
  try { return game.settings.get("motwm-xp", key) as T; }
  catch { return fallback; }
}

type PartyEntry = { id: string; name: string; img: string; level: number; earns: boolean; friend: boolean; };
type EnemyEntry = { id: string; name: string; img: string; cr: number; };

export class XpCalculatorApp extends Application {
  private party: Map<string, PartyEntry> = new Map();
  private enemies: Map<string, EnemyEntry> = new Map();
  private manualAwards: Map<string, ManualAward> = new Map(); // key: actorId
  private elDelta: number = 0;
  private showElDetails: boolean = false;
  private lastAward: {
    enemies: Map<string, EnemyEntry>;
    manualAwards: Map<string, ManualAward>;
    elDelta: number;
    grants: { id: string; name: string; xp: number }[];
    chatMessageIds: string[];
  } | null = null;

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "motwmxp-calc",
      title: "MOTWM XP Calculator",
      width: 960,
      height: 660,
      resizable: true,
      template: "modules/motwm-xp/templates/xp-calculator.hbs"
    });
  }

/* ---------- DATA ---------- */
getData(): any {
  // Build EL from enemies (group by CR)
  const crMap = new Map<number, number>();
  for (const e of this.enemies.values()) {
    const cr = Math.max(1, Math.floor(Number(e.cr) || 0));
    crMap.set(cr, (crMap.get(cr) ?? 0) + 1);
  }
  const groupELs: number[] = [];
  for (const [cr, count] of crMap.entries()) groupELs.push(groupToEL(cr, count));

  // Integer-only EL (allow negative integer modifier)
  const baseEL = groupELs.length ? combineELs(groupELs) : 0;
  const delta = Number.isFinite(this.elDelta) ? Math.trunc(this.elDelta) : 0;
  const elInt = baseEL + delta; // use this for UI and award math

  // Calculate APL and encounter difficulty with party size adjustment
  const partyLevels = [...this.party.values()].map(p => p.level);
  const partySize = partyLevels.length;
  const baseApl = partyLevels.length > 0 ? Math.round(partyLevels.reduce((sum, lvl) => sum + lvl, 0) / partyLevels.length * 10) / 10 : 0;
  
  // PF1e party size adjustment: +1 for 6+ chars, -1 for ≤3 chars
  let sizeAdjustment = 0;
  if (partySize >= 6) sizeAdjustment = Math.floor((partySize - 4) / 2);
  else if (partySize <= 3) sizeAdjustment = -1;
  
  const adjustedApl = baseApl + sizeAdjustment;
  const elDiff = elInt - adjustedApl;
  
  let difficulty = "—";
  if (baseApl > 0 && elInt > 0) {
    if (elDiff < 0) difficulty = "Easy";
    else if (elDiff === 0) difficulty = "Even";
    else if (elDiff === 1) difficulty = "Challenging";
    else if (elDiff === 2) difficulty = "Very Challenging";
    else difficulty = "High Risk";
  }
  
  const encounterInfo = baseApl > 0 && elInt > 0 
    ? `APL: ${adjustedApl.toFixed(1)} (${baseApl} base, ${sizeAdjustment >= 0 ? '+' : ''}${sizeAdjustment} size) | EL: ${elInt} | Difficulty: ${difficulty} (${elDiff >= 0 ? '+' : ''}${elDiff})`
    : "—";

  // Detailed EL breakdown for toggle view with step-by-step tree format
  let elBreakdown = "";
  if (groupELs.length > 0) {
    const lines: string[] = [];
    
    // Step 1: Show individual CR group conversions
    const crGroups = [...crMap.entries()].map(([cr, count]) => {
      const groupEL = groupToEL(cr, count);
      return { cr, count, groupEL, text: `${count}×CR${cr} → EL${groupEL}` };
    }).sort((a, b) => b.groupEL - a.groupEL); // Sort by EL descending
    
    lines.push(...crGroups.map(g => `└─ ${g.text}`));
    
    // Step 2: Show combination process if multiple groups
    if (crGroups.length > 1) {
      const sortedELs = crGroups.map(g => g.groupEL).sort((a, b) => b - a);
      let combineSteps: string[] = [];
      let remaining = [...sortedELs];
      
      while (remaining.length > 1) {
        const highest = remaining.shift()!;
        const second = remaining.shift()!;
        const diff = Math.abs(highest - second);
        let combined = highest;
        
        if (diff === 0) {
          combined = highest + 2;
          combineSteps.push(`EL${highest} + EL${second} (same) → EL${combined}`);
        } else if (diff === 1 || diff === 2) {
          combined = highest + 1;
          combineSteps.push(`EL${highest} + EL${second} (±${diff}) → EL${combined}`);
        } else {
          combineSteps.push(`EL${highest} + EL${second} (±${diff}, negligible) → EL${highest}`);
        }
        
        remaining.push(combined);
        remaining.sort((a, b) => b - a);
      }
      
      lines.push(...combineSteps.map(step => `    └─ ${step}`));
    }
    
    // Step 3: Show EL modifier if any
    if (this.elDelta !== 0) {
      lines.push(`    └─ EL modifier ${this.elDelta >= 0 ? '+' : ''}${this.elDelta} → EL${elInt}`);
    }
    
    elBreakdown = lines.join('\n');
  }

  // Settings
  const awardMode = game.settings.get("motwm-xp", "awardMode") as string;

  // Party array + display bubble size + current manual award values
  const partyArr = [...this.party.values()].map(p => {
    const m = this.manualAwards?.get?.(p.id) ?? { amount: 0, unit: "points", reason: "" };
    return {
      ...p,
      bubble: Math.round(bubbleSizeForLevel(p.level)),
      manual: m
    };
  });

  // Live preview
  let preview: any[] = [];

  if (elInt > 0 && partyArr.some(p => p.earns)) {
    if (awardMode === "raw35") {
      // RAW 3.5e per-PC
      preview = partyArr.filter(p => p.earns).map(p => ({
        id: p.id, name: p.name, level: p.level,
        el: elInt,
        xp: awardRaw35(p.level, elInt)
      }));
    } else if (awardMode === "split30") {
      // D&D 3.0 split pot (using actual DMG table)
      const apl = Math.round(partyArr.reduce((a, p) => a + p.level, 0) / Math.max(1, partyArr.length));
      const pot = getPot30(apl, elInt);
      const earners = partyArr.filter(p => p.earns);
      const slice = split30(pot, 1, earners.length);
      preview = earners.map(p => ({
        id: p.id, name: p.name, level: p.level,
        el: elInt,
        xp: slice
      }));
    }
  }

  return {
    party: partyArr,
    enemies: [...this.enemies.values()],
    el: elInt,               // integer EL for UI
    encounterInfo: encounterInfo,
    elBreakdown: elBreakdown,
    showElDetails: this.showElDetails,
    elDelta: this.elDelta,   // bind input directly to this value
    preview,
    hasRollback: !!this.lastAward
  };
}

/* ---------- LISTENERS ---------- */
activateListeners(html: JQuery) {
  super.activateListeners(html);

  // --- Row actions ---
  html.on("click", "[data-action='remove-party']", ev => {
    const id = (ev.currentTarget as HTMLElement).dataset.id!;
    this.party.delete(id);
    this.render();
  });

  html.on("click", "[data-action='remove-enemy']", ev => {
    const id = (ev.currentTarget as HTMLElement).dataset.id!;
    this.enemies.delete(id);
    this.render();
  });

  html.on("change", "input[data-action='toggle-earns']", ev => {
    const id = (ev.currentTarget as HTMLInputElement).dataset.id!;
    const p = this.party.get(id);
    if (p) {
      p.earns = (ev.currentTarget as HTMLInputElement).checked;
      this.render(false);
    }
  });

  // --- EL modifier: integer only, allow negatives ---
  html.on("change blur", "[data-action='el-delta']", ev => {
    const s = (ev.currentTarget as HTMLInputElement).value.trim();
    if (s === "" || s === "-") return;                 // ignore incomplete/empty
    const n = parseInt(s, 10);
    this.elDelta = Number.isFinite(n) ? n : 0;         // commit integer
    this.render(true);                                  // refresh preview
  });

  // --- Manual Award inputs (per-party row) ---
  html.on("input", "[data-action='award-amount']", ev => {
    const row = (ev.currentTarget as HTMLElement).closest("[data-id]") as HTMLElement;
    const id = row?.dataset.id!;
    const prev = this.manualAwards.get(id) ?? { amount: 0, unit: "points", reason: "" };
    this.manualAwards.set(id, { ...prev, amount: Number((ev.currentTarget as HTMLInputElement).value) || 0 });
  });

  html.on("change", "[data-action='award-unit']", ev => {
    const row = (ev.currentTarget as HTMLElement).closest("[data-id]") as HTMLElement;
    const id = row?.dataset.id!;
    const prev = this.manualAwards.get(id) ?? { amount: 0, unit: "points", reason: "" };
    this.manualAwards.set(id, { ...prev, unit: ((ev.currentTarget as HTMLSelectElement).value as "points" | "bubbles") });
  });

  html.on("input", "[data-action='award-reason']", ev => {
    const row = (ev.currentTarget as HTMLElement).closest("[data-id]") as HTMLElement;
    const id = row?.dataset.id!;
    const prev = this.manualAwards.get(id) ?? { amount: 0, unit: "points", reason: "" };
    this.manualAwards.set(id, { ...prev, reason: (ev.currentTarget as HTMLInputElement).value ?? "" });
  });

  // --- Party / setup sources (NEW canonical set) ---
  html.on("click", "[data-action='add-online-assigned']", () => this.addAssignedPlayersToPartyOnlineOnly());
  html.on("click", "[data-action='add-all-assigned']",   () => this.addAssignedPlayersToPartyAll());
  html.on("click", "[data-action='add-friendly-scene']", () => this.addFriendlySceneTokensToParty());
  html.on("click", "[data-action='add-selected-party']", () => this.addSelectedToParty());

  // --- Enemies sources ---
  html.on("click", "[data-action='add-selected-enemies']", () => this.addSelectedToEnemies());
  html.on("click", "[data-action='add-hostile-scene']",    () => this.addHostileSceneTokensToEnemies());
  html.on("click", "[data-action='add-neutral-scene']",    () => this.addNeutralSceneTokensToEnemies());

  // --- Clearers ---
  html.on("click", "[data-action='clear-party']",   () => { this.party.clear();   this.render(true); });
  html.on("click", "[data-action='clear-enemies']", () => { this.enemies.clear(); this.render(true); });

  // --- Apply & Rollback ---
  html.on("click", "[data-action='apply-xp']", () => this.applyXP());
  html.on("click", "[data-action='rollback-xp']", () => this.rollbackXP());

  // --- EL Details Toggle ---
  html.on("click", "[data-action='toggle-el-details']", () => {
    this.showElDetails = !this.showElDetails;
    (this as any).render(false);
  });

  // --- Double-click to open character sheets ---
  html.on("dblclick", ".party .row", ev => {
    // Don't open sheet if user double-clicked on interactive elements
    const target = ev.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    const id = (ev.currentTarget as HTMLElement).dataset.id;
    if (id) {
      const actor = (game as any).actors?.get(id);
      if (actor?.sheet) {
        (actor.sheet as any).render(true);
      }
    }
  });

  html.on("dblclick", ".enemies .row", ev => {
    // Don't open sheet if user double-clicked on interactive elements
    const target = ev.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    const id = (ev.currentTarget as HTMLElement).dataset.id;
    if (id) {
      const actor = (game as any).actors?.get(id);
      if (actor?.sheet) {
        (actor.sheet as any).render(true);
      }
    }
  });
  }
  
/** --- CR extraction used for enemies (unified across all adders) --- */
private getActorCR(a: Actor): number {
  // Try the common CR property paths first (D35E often stores under .details.cr.value)
  const crPaths = [
    "system.details.cr.value",   // primary (most D35E sheets)
    "system.details.cr",         // sometimes a plain number
    "data.details.cr.value",     // legacy fallback
    "data.details.cr"            // legacy fallback
  ];

  for (const p of crPaths) {
    // @ts-ignore
    const v = Number(getProperty(a, p));
    if (Number.isFinite(v) && v > 0) return Math.round(v); // keep integer behavior
  }

  // Derive from level if no explicit CR present
  // @ts-ignore
  const type  = (a as any).type;
  // @ts-ignore
  const level = Number(getProperty(a, "system.details.level.value")) || 0;

  if (type === "character") {
    // RAW quick heuristic: PC CR ≈ Character Level (adjust here if you use NPC-class rules)
    return Math.max(1, Math.floor(level));
  }

  // Monsters/NPCs with no CR: fall back to level if present, else 1
  return Math.max(1, Math.floor(level) || 1);
}


/** Add all hostile tokens on the current scene to the enemies list (with proper CR). */
private addHostileSceneTokensToEnemies(): void {
  const HOSTILE = (CONST as any)?.TOKEN_DISPOSITIONS?.HOSTILE ?? -1;
  const tokens = canvas.tokens?.placeables ?? [];
  const actors = tokens
    .filter(t => (t as any).document?.disposition === HOSTILE)
    .map(t => t.actor)
    .filter((a): a is Actor => !!a);

  let added = 0;
  for (const a of actors) {
    if (!a?.id || this.enemies.has(a.id)) continue;

    const name = a.name ?? "Unknown";
    // @ts-ignore
    const img  = a.img ?? a.prototypeToken?.texture?.src ?? "icons/svg/skull.svg";
    const cr   = this.getActorCR(a); // <-- unified CR conversion

    this.enemies.set(a.id, { id: a.id, name, img, cr });
    added++;
  }
  ui.notifications?.info(`Added ${added} hostile actor(s) from this scene.`);
  this.render(true);
}

/** Add all neutral tokens on the current scene to the enemies list (with proper CR). */
private addNeutralSceneTokensToEnemies(): void {
  const NEUTRAL = (CONST as any)?.TOKEN_DISPOSITIONS?.NEUTRAL ?? 0;
  const tokens = canvas.tokens?.placeables ?? [];
  const actors = tokens
    .filter(t => (t as any).document?.disposition === NEUTRAL)
    .map(t => t.actor)
    .filter((a): a is Actor => !!a);

  let added = 0;
  for (const a of actors) {
    if (!a?.id || this.enemies.has(a.id)) continue;

    const name = a.name ?? "Unknown";
    // @ts-ignore
    const img  = a.img ?? a.prototypeToken?.texture?.src ?? "icons/svg/eye.svg";
    const cr   = this.getActorCR(a); // <-- unified CR conversion

    this.enemies.set(a.id, { id: a.id, name, img, cr });
    added++;
  }
  ui.notifications?.info(`Added ${added} neutral actor(s) from this scene.`);
  this.render(true);
}

/** Add a batch of actors into the calculator "party" list (dedup by actor id). */
private addActorsToParty(actors: Actor[]): number {
  let added = 0;
  for (const a of actors) {
    if (!a?.id || this.party.has(a.id)) continue;

    const name  = a.name ?? "Unknown";
    // @ts-ignore
    const img   = a.img ?? a.prototypeToken?.texture?.src ?? "icons/svg/mystery-man.svg";
    // @ts-ignore
    const level = Number(getProperty(a, "system.details.level.value")) || 1;

    this.party.set(a.id, { id: a.id, name, img, level, earns: true, friend: false });
    added++;
  }
  return added;
}


/** (1) Online users with assigned characters (simulate party addon). */
private addAssignedPlayersToPartyOnlineOnly(): void {
  const users = game.users?.players ?? [];
  const online = users.filter(u => u.active);
  const actors = online.map(u => u.character).filter((a): a is Actor => !!a);
  const added = this.addActorsToParty(actors);
  ui.notifications?.info(`Added ${added} online assigned PC(s).`);
  this.render(true);
}

/** (2) All users with assigned characters (online or not). */
private addAssignedPlayersToPartyAll(): void {
  const users = game.users?.players ?? [];
  const actors = users.map(u => u.character).filter((a): a is Actor => !!a);
  const added = this.addActorsToParty(actors);
  ui.notifications?.info(`Added ${added} assigned PC(s) (all logins).`);
  this.render(true);
}

/** (3) All tokens marked Friendly on current scene (any actor behind them). */
private addFriendlySceneTokensToParty(): void {
  const FRIENDLY = (CONST as any)?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1;
  const tokens = canvas.tokens?.placeables ?? [];
  const actors = tokens
    .filter(t => (t as any).document?.disposition === FRIENDLY)
    .map(t => t.actor)
    .filter((a): a is Actor => !!a);

  const added = this.addActorsToParty(actors);
  ui.notifications?.info(`Added ${added} Friendly token actor(s) from this scene.`);
  this.render(true);
}

/** Populate from the CURRENT SCENE: only Friendly PC tokens (actor.type === "character"). */
private populateScenePlayers(): void {
  const FRIENDLY = (CONST as any)?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1;

  const tokens = canvas.tokens?.placeables ?? [];
  const actors: Actor[] = [];

  for (const t of tokens) {
    const doc = (t as any).document;           // TokenDocument
    const a: Actor | undefined = t.actor ?? undefined;
    if (!doc || !a) continue;

    const isFriendly = doc.disposition === FRIENDLY;
    const isPC = (a as any).type === "character";  // D35E PCs

    if (isFriendly && isPC) actors.push(a);
  }

  const added = this.addActorsToParty(actors);
  ui.notifications?.info(`Added ${added} Friendly PC(s) from this scene.`);
  this.render(true);
}

/** Add members from Foundry's built-in Party (game.party.members). */
private addFoundryParty(): void {
  let actors: Actor[] = [];

  // Primary: Core Party (v11+)
  const coreParty: any = (game as any).party;
  if (coreParty?.members?.length) {
    actors = coreParty.members
      .map((m: any) => m?.actor)
      .filter((a: Actor | undefined) => !!a);
  }

  // OPTIONAL fallback: if you want strictly "Party only", comment these two blocks out
  if (!actors.length) {
    // Fallback #1: users' assigned characters
    const pcs = game.users?.players
      .map(u => u.character)
      .filter((a: Actor | undefined) => !!a) as Actor[];
    actors = pcs;
  }
  if (!actors.length) {
    // Fallback #2: any PC actors on scene (not restricted to Friendly)
    const tokens = canvas.tokens?.placeables ?? [];
    actors = tokens
      .map(t => t.actor)
      .filter((a): a is Actor => !!a && ((a as any).type === "character"));
  }
  // END fallbacks

  const added = this.addActorsToParty(actors);
  ui.notifications?.info(`Added ${added} actor(s) from Foundry Party.`);
  this.render(true);
}
  /* ---------- ACTIONS ---------- */

  private _manualAwardsToGrants(): { id: string; name: string; xp: number; reason: string }[] {
  const out: { id: string; name: string; xp: number; reason: string }[] = [];
  for (const [id, award] of this.manualAwards) {
    if (!award || !award.amount) continue;
    const actor = game.actors?.get(id);
    if (!actor) continue;
    const name = actor.name ?? id;
    // @ts-ignore
    const lvl = Number(getProperty(actor, "system.details.level.value") ?? 1);
    const perBubble = bubbleSizeForLevel(lvl);
    const xp = Math.round(award.unit === "bubbles" ? award.amount * perBubble : award.amount);
    if (xp !== 0) out.push({ id, name, xp, reason: award.reason?.trim() || "Manual award" });
  }
  return out;
}

  private populatePartyPlayers() {
    let added = 0, skipped = 0;
    const players = game.users?.players ?? [];
    for (const u of players) {
      const a = u.character as Actor | undefined;
      if (!a) continue;
      if (this.enemies.has(a.id)) { skipped++; continue; }
      const level = D35EAdapter.getLevel(a) || 1;
      const entry: PartyEntry = {
        id: a.id, name: a.name ?? "Actor", img: a.img ?? "",
        level, earns: true, friend: !a.hasPlayerOwner
      };
      if (!this.party.has(a.id)) { this.party.set(a.id, entry); added++; } else skipped++;
    }
    ui.notifications?.info(`Party +${added}${skipped ? `, skipped ${skipped}` : ""}`);
    this.render();
  }

  private addSelectedToParty() {
    const selected = canvas?.tokens?.controlled ?? [];
    if (!selected.length) return ui.notifications?.warn("Select one or more tokens first.");
    let added = 0, skipped = 0;
    for (const t of selected) {
      const a = (t as any).actor as Actor | null;
      if (!a) { skipped++; continue; }
      if (this.enemies.has(a.id)) { skipped++; continue; }
      const level = D35EAdapter.getLevel(a) || 1;
      const entry: PartyEntry = {
        id: a.id, name: a.name ?? "Actor", img: a.img ?? "",
        level, earns: true, friend: !a.hasPlayerOwner
      };
      if (!this.party.has(a.id)) { this.party.set(a.id, entry); added++; } else skipped++;
    }
    ui.notifications?.info(`Party +${added}${skipped ? `, skipped ${skipped}` : ""}`);
    this.render();
  }

/** Add currently selected canvas tokens as enemies (uses unified CR logic). */
private addSelectedToEnemies(): void {
  const selected = canvas?.tokens?.controlled ?? [];
  if (!selected.length) {
    ui.notifications?.warn("Select one or more tokens first.");
    return;
  }

  let added = 0, skipped = 0;

  for (const t of selected) {
    const a: Actor | undefined = (t as any).actor;
    if (!a) { skipped++; continue; }

    // Don’t duplicate party members or existing enemies
    if (this.party.has(a.id) || this.enemies.has(a.id)) { skipped++; continue; }

    // Unified CR extraction (matches hostile/neutral adders)
    const cr = this.getActorCR(a);
    if (!Number.isFinite(cr) || cr <= 0) { skipped++; continue; }

    // Safe image fallbacks
    // @ts-ignore
    const img = a.img ?? a.prototypeToken?.texture?.src ?? "icons/svg/skull.svg";
    const name = a.name ?? "Enemy";

    const entry: EnemyEntry = { id: a.id, name, img, cr: Number(cr) };
    this.enemies.set(a.id, entry);
    added++;
  }

  ui.notifications?.info(`Enemies +${added}${skipped ? `, skipped ${skipped}` : ""}`);
  this.render(true); // refresh preview with updated enemies
}


  private addTargetedToEnemies() {
    const targets = game.user?.targets ?? new Set();
    if (!targets.size) return ui.notifications?.warn("Target one or more creatures first.");
    let added = 0, skipped = 0;
    for (const t of targets as any as Token[]) {
      const a = (t as any).actor as Actor | null;
      if (!a) { skipped++; continue; }
      if (this.party.has(a.id)) { skipped++; continue; }
      const crRaw = D35EAdapter.getCR(a); if (!crRaw) { skipped++; continue; }
      const entry: EnemyEntry = { id: a.id, name: a.name ?? "Enemy", img: a.img ?? "", cr: Number(crRaw) };
      if (!this.enemies.has(a.id)) { this.enemies.set(a.id, entry); added++; } else skipped++;
    }
    ui.notifications?.info(`Enemies +${added}${skipped ? `, skipped ${skipped}` : ""}`);
    this.render();
  }

  private async applyXP() {
  // --- 1) Build encounter grants from your existing preview (keep your logic) ---
  const encounterGrants: { id: string; name: string; xp: number }[] = [];
  const partyArr = [...this.party.values()];
  const earners = partyArr.filter(p => p.earns);

  // Recompute encounter preview (mirror your getData preview branch)
  const crMap = new Map<number, number>();
  for (const e of this.enemies.values()) {
    const cr = Math.max(1, Math.floor(Number(e.cr) || 0));
    crMap.set(cr, (crMap.get(cr) ?? 0) + 1);
  }
  const groupELs: number[] = [];
  for (const [cr, count] of crMap.entries()) groupELs.push(groupToEL(cr, count));
  let el = groupELs.length ? combineELs(groupELs) : 0;
  el += this.elDelta;

  const awardMode = game.settings.get("motwm-xp", "awardMode") as string;
  if (el > 0 && earners.length) {
    if (awardMode === "raw35") {
      for (const p of earners) encounterGrants.push({ id: p.id, name: p.name, xp: awardRaw35(p.level, el) });
    } else if (awardMode === "split30") {
      const apl = Math.round(partyArr.reduce((a, p) => a + p.level, 0) / Math.max(1, partyArr.length));
      const pot = getPot30(apl, el);
      const slice = split30(pot, 1, earners.length);
      for (const p of earners) encounterGrants.push({ id: p.id, name: p.name, xp: slice });
    }
  }

  // --- 2) Build manual grants (points or segments) ---
  const manualGrants = this._manualAwardsToGrants();

  // --- 3) Guard: nothing to award at all ---
  if (!encounterGrants.length && !manualGrants.length) {
    ui.notifications?.info("No XP to award: add enemies and/or manual awards first.");
    return;
  }

  // --- 4) Apply: encounter first, then manual (order is cosmetic only) ---
  const applyGrants = async (grants: { id: string; name: string; xp: number }[]) => {
    for (const g of grants) {
      const actor = game.actors?.get(g.id);
      if (!actor) continue;
      // @ts-ignore
      const curr = Number(getProperty(actor, "system.details.xp.value") ?? 0);
      await actor.update({ "system.details.xp.value": curr + g.xp });
    }
  };

  if (encounterGrants.length) await applyGrants(encounterGrants);
  if (manualGrants.length)    await applyGrants(manualGrants);

  // --- 5) Chat: separate cards for clarity ---
  const chatMessageIds: string[] = [];

  if (game.settings.get("motwm-xp", "broadcastChat")) {
    const esc = (str: any) => {
      try { return TextEditor.escapeHTML(String(str ?? "")); }
      catch {
        // @ts-ignore
        return foundry.utils?.escapeHTML
          ? foundry.utils.escapeHTML(String(str ?? ""))
          : String(str ?? "").replace(/[&<>"']/g, s =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[s])
            );
      }
    };

    const makeList = (items: { name: string; xp: number; reason?: string }[]) =>
      `<ul>${items.map(a => {
        const safeName = esc(a.name);
        const r = a.reason ? ` <em>(${esc(a.reason)})</em>` : "";
        return `<li><b>${safeName}</b>: +${a.xp.toLocaleString()} XP${r}</li>`;
      }).join("")}</ul>`;

    if (encounterGrants.length) {
      const html = `<div><h3>Encounter XP Awards</h3>${makeList(encounterGrants)}</div>`;
      const msg = await ChatMessage.create({ content: html });
      if (msg?.id) chatMessageIds.push(msg.id);
    }
    if (manualGrants.length) {
      // attach reasons where available
      const withReasons = manualGrants.map(g => ({ ...g, reason: (this.manualAwards.get(g.id)?.reason) || "Manual award" }));
      const html = `<div><h3>Manual XP Awards</h3>${makeList(withReasons)}</div>`;
      const msg = await ChatMessage.create({ content: html });
      if (msg?.id) chatMessageIds.push(msg.id);
    }
  }

  // --- 6) Save state for rollback, then clear encounter inputs ---
  this.lastAward = {
    enemies: new Map(this.enemies),
    manualAwards: new Map(this.manualAwards),
    elDelta: this.elDelta,
    grants: [...encounterGrants, ...manualGrants],
    chatMessageIds: chatMessageIds
  };

  this.enemies.clear();
  this.manualAwards.clear();
  this.elDelta = 0;

  // Re-render to show cleared state
  this.render(true);
  }

  private async rollbackXP() {
  if (!this.lastAward) {
    ui.notifications?.warn("No XP award to rollback.");
    return;
  }

  // --- 1) Delete chat messages ---
  for (const id of this.lastAward.chatMessageIds) {
    const msg = game.messages?.get(id);
    await msg?.delete();
  }

  // --- 2) Reverse the XP grants ---
  const reverseGrants = async (grants: { id: string; name: string; xp: number }[]) => {
    for (const g of grants) {
      const actor = game.actors?.get(g.id);
      if (!actor) continue;
      // @ts-ignore
      const curr = Number(getProperty(actor, "system.details.xp.value") ?? 0);
      await actor.update({ "system.details.xp.value": curr - g.xp });
    }
  };

  await reverseGrants(this.lastAward.grants);

  // --- 3) Restore the state ---
  this.enemies = new Map(this.lastAward.enemies);
  this.manualAwards = new Map(this.lastAward.manualAwards);
  this.elDelta = this.lastAward.elDelta;

  // --- 4) Clear rollback history ---
  this.lastAward = null;

  // --- 5) Notify & re-render ---
  ui.notifications?.info("XP award rolled back.");
  this.render(true);
  }

}