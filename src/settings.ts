export function registerSettings() {
  // Chat toggle
  game.settings.register("motwm-xp", "broadcastChat", {
    name: "Broadcast XP to Chat",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Player XP bar visible
  game.settings.register("motwm-xp", "showPlayerBar", {
    name: "Show Player XP Bar",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
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
    hint: "RAW 3.5e = per-PC (Level vs EL). Classic 3.0 = split single pot based on APL.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      raw35: "D&D 3.5e (per-PC)",
      split30: "D&D 3.0 (split pot)"
    },
    default: "raw35"
  });
}
