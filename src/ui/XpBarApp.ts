import { systemTotalXPForLevel, bubblesForLevel } from "../calc/xp";

type Pos = { left: number; top: number };

export class XpBarApp extends Application {
  actor: Actor;
  private _dragging = false;
  private _dragOffset = { x: 0, y: 0 };
  private _wired = false; // prevent duplicate listeners

  constructor(actor: Actor, options: Partial<ApplicationOptions> = {}) {
    super({ popOut: false, id: "motwmxp-bar", ...options });
    this.actor = actor;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "motwmxp-bar",
      template: "modules/motwm-xp/src/ui/templates/xp-bar.hbs"
    });
  }

  /* ---------- position helpers ---------- */
  private _getSavedPos(): Pos | null {
    const p = game.settings.get("motwm-xp", "barPos") as any;
    return p && Number.isFinite(p.left) && Number.isFinite(p.top) ? p : null;
  }

  private async _savePos(left: number, top: number) {
    await game.settings.set("motwm-xp", "barPos", { left, top });
  }

  /** Apply pixel position; if none saved, center by calculating pixels (no CSS transform). */
  private _applyPos() {
    const el = this.element[0] as HTMLElement;
    if (!el) return;

    const saved = this._getSavedPos();
    el.style.position = "fixed";
    el.style.zIndex = "70000";

    if (saved) {
      el.style.left = `${saved.left}px`;
      el.style.top  = `${saved.top}px`;
    } else {
      // compute pixel-centered bottom position once
      const w = el.getBoundingClientRect().width || 520;
      const h = el.getBoundingClientRect().height || 18;
      const left = Math.round((window.innerWidth  - w) / 2);
      const top  = Math.round(window.innerHeight - h - 8);
      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    }
  }

  /* ---------- data: layers + segments ---------- */
  getData(): any {
    // read from sheet/system
    // @ts-ignore
    const lvl = Number(getProperty(this.actor, "system.details.level.value") ?? 1);
    // @ts-ignore
    const totalXP = Number(getProperty(this.actor, "system.details.xp.value") ?? 0);
    // @ts-ignore
    const nextFromSheet = getProperty(this.actor, "system.details.xp.max");

    const next0 = Number(nextFromSheet != null ? nextFromSheet : systemTotalXPForLevel(lvl + 1));
    const prev0 = systemTotalXPForLevel(lvl);

    // thresholds for up to 3 layers
    const thresholds = [prev0, next0, systemTotalXPForLevel(lvl + 2), systemTotalXPForLevel(lvl + 3)];

    // consume excess into layers
    let excess = Math.max(0, totalXP - thresholds[0]);
    const layers: { class: string; width: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const span = Math.max(1, thresholds[i + 1] - thresholds[i]);
      const frac = Math.max(0, Math.min(1, excess / span));
      layers.push({ class: `layer${i}`, width: Math.round(frac * 10000) / 100 });
      excess = Math.max(0, excess - span);
    }

    // segments (13 + mini 1/3)
    const segments: any[] = [];
    const totalSegs = bubblesForLevel();
    for (let i = 1; i <= 13; i++) segments.push({ left: (i / totalSegs) * 100, class: "" });
    segments.push({ left: (13 / totalSegs) * 100, class: "mini" });

    const label = `Lv ${lvl} | ${totalXP.toLocaleString()} / ${next0.toLocaleString()} XP`;
    const tooltip = `Level: ${lvl}`;

    return { layers, segments, label, tooltip };
  }

  /* ---------- render & drag ---------- */
  async _render(force?: boolean, options?: any): Promise<void> {
    await super._render(force, options);
    this._applyPos();

    if (this._wired) return; // don’t double-bind
    this._wired = true;

    const el = this.element[0] as HTMLElement;

    // DRAG ON WHOLE BAR
    el.addEventListener("pointerdown", (ev: PointerEvent) => {
      ev.preventDefault();

      // 1) snapshot current pixels BEFORE any style changes
      const rect = el.getBoundingClientRect();

      // 2) ensure explicit pixel position (no bottom/transform anywhere)
      el.style.left = `${rect.left}px`;
      el.style.top  = `${rect.top}px`;

      // 3) start drag
      this._dragging = true;
      (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);

      // 4) offset from pointer to element origin
      this._dragOffset.x = ev.clientX - rect.left;
      this._dragOffset.y = ev.clientY - rect.top;
    });

    window.addEventListener("pointermove", (ev: PointerEvent) => {
      if (!this._dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth  - 50, ev.clientX - this._dragOffset.x));
      const top  = Math.max(0, Math.min(window.innerHeight - 24, ev.clientY - this._dragOffset.y));
      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    });

    window.addEventListener("pointerup", async () => {
      if (!this._dragging) return;
      this._dragging = false;
      const left = parseInt(el.style.left || "0", 10);
      const top  = parseInt(el.style.top  || "0", 10);
      await this._savePos(left, top);
    });

    // keep it on-screen on resize; if saved, re-apply saved pixels; else re-center by pixels
    window.addEventListener("resize", () => this._applyPos(), { passive: true });
  }

  render(force?: boolean, options?: any): this {
    const show = game.settings.get("motwm-xp", "showPlayerBar") as boolean;
    if (!show) return this;
    return super.render(force, options);
  }
}
