export function registerSettings() {
  // Chat toggle
  game.settings.register("motwm-xp", "broadcastChat", {
    name: "Broadcast XP to Chat",
    hint: "When enabled, XP awards are posted as chat messages visible to all players.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Player XP bar visible
  game.settings.register("motwm-xp", "showPlayerBar", {
    name: "Show Player XP Bar",
    hint: "Display a draggable XP progress bar on your screen for your assigned character.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value: boolean) => {
      // Show/hide the XP bar immediately when the setting changes
      const myActor = game.user?.character;
      if (!myActor) return;

      const bars = (window as any).MOTWM_XP?.bars;
      if (!bars) return;

      const actorId = typeof myActor === "string" ? myActor : myActor.id;
      let app = bars.get(actorId);

      if (value) {
        if (!app) {
          const actor = typeof myActor === "string" ? game.actors?.get(myActor) : myActor;
          const XpBarApp = (window as any).MOTWM_XP?.XpBarApp;
          if (!actor || !XpBarApp) return;
          app = new XpBarApp(actor, { top: window.innerHeight - 54, left: 0 });
          bars.set(actor.id, app);
        }
        app.render(true);
      } else {
        if (app) {
          (app as any).close();
        }
      }
    }
  });

  // Player XP bar position (hidden, per-client)
  game.settings.register("motwm-xp", "barPos", {
    name: "XP Bar Position",
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  // Calculator award mode (the calculator reads this)
  game.settings.register("motwm-xp", "awardMode", {
    name: "XP Award Method",
    hint: "DMG 3.5e: Official per-monster method using Table 2-6 (each PC's level vs each monster's CR). D&D 3.0: Split-pot method (total party XP divided equally).",
    scope: "world",
    config: true,
    type: String,
    choices: {
      dmg35: "D&D 3.5e (Individual XP)",
      split30: "D&D 3.0 (split pot by APL)"
    },
    default: "dmg35",
    onChange: () => {
      const calc = (window as any).MOTWM_XP?.calc;
      if (calc?.element) {
        calc.render(false);
      }
    }
  });
}
