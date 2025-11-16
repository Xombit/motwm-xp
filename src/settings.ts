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
      
      let app = bars.get(myActor.id);
      
      if (value) {
        // Show the bar
        if (!app) {
          // XpBarApp class is stored in window.MOTWM_XP.XpBarApp by main.ts
          const XpBarApp = (window as any).MOTWM_XP?.XpBarApp;
          if (!XpBarApp) return;
          app = new XpBarApp(myActor, { top: window.innerHeight - 54, left: 0 });
          bars.set(myActor.id, app);
        }
        app.render(true);
      } else {
        // Hide the bar
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
    default: "dmg35"
  });
}
