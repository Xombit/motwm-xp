export class D35EAdapter {
  static getXP(actor: Actor): number {
    // @ts-ignore
    const v = getProperty(actor, "system.details.xp.value");
    return Number(v ?? 0);
  }
  static async setXP(actor: Actor, value: number) {
    return actor.update({ "system.details.xp.value": Number(value) });
  }
  static getLevel(actor: Actor): number {
    // Prefer summed classes for characters
    // @ts-ignore
    const classes = getProperty(actor, "system.classes");
    if (classes && typeof classes === "object") {
      let total = 0;
      for (const cls of Object.values(classes) as any[]) {
        const lv = Number(getProperty(cls, "level") ?? 0);
        total += lv;
      }
      if (total > 0) return total;
    }
    // Fallback (NPCs/monsters often have this)
    // @ts-ignore
    const fallback = getProperty(actor, "system.details.level.value");
    return Number(fallback ?? 0);
  }
  static getCR(actor: Actor): number | null {
    // D35E system stores CR in different ways:
    // - system.details.totalCr = adjusted CR with templates (PRIORITY!)
    // - system.details.cr = base CR without templates
    const crPaths = [
      "system.details.totalCr",     // D35E: adjusted CR (includes templates!) - CHECK THIS FIRST
      "system.details.cr.total",    // alternative adjusted CR format
      "system.attributes.cr.total", // yet another alternative
      "system.details.cr.value",    // structured base CR
      "system.details.cr",          // flat base CR number
      "data.details.totalCr",       // legacy adjusted
      "data.details.cr.total",      // legacy adjusted
      "data.details.cr.value",      // legacy base CR
      "data.details.cr"             // legacy flat number
    ];
    
    for (const path of crPaths) {
      // @ts-ignore
      const cr = getProperty(actor, path);
      if (cr != null && Number.isFinite(Number(cr))) return Number(cr);
    }
    
    // fallback: treat level as CR (PC-sheet BBEG)
    const lvl = this.getLevel(actor);
    return lvl ? Number(lvl) : null;
  }
}
