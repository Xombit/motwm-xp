import { registerSettings } from "./settings";
import { XpCalculatorApp } from "./ui/XpCalculatorApp";
import { XpBarApp } from "./ui/XpBarApp";
import "./styles/styles.css";

declare global {
  interface Window {
    MOTWM_XP?: {
      calc?: XpCalculatorApp;
      bars?: Map<string, XpBarApp>;
    };
  }
}

Hooks.once("init", () => {
  console.log("motwm-xp | init");
  registerSettings();
  window.MOTWM_XP = window.MOTWM_XP ?? { bars: new Map() };
});

Hooks.once("ready", () => {
  console.log("motwm-xp | ready");

  // Player XP bar: each user sees their own assigned character (if any)
  const show = game.settings.get("motwm-xp", "showPlayerBar") as boolean;
  const myActor = game.user?.character as Actor | undefined;
  if (show && myActor) {
    const bars = window.MOTWM_XP!.bars!;
    let app = bars.get(myActor.id);
    if (!app) {
      app = new XpBarApp(myActor, { top: window.innerHeight - 54, left: 0 });
      bars.set(myActor.id, app);
    }
    app.render(true);
  }

  // Re-render my bar if my actor's XP/level changes
  Hooks.on("updateActor", (actor: Actor, changes: any) => {
    const a = game.user?.character;
    if (!a || actor.id !== a.id) return;
    const app = window.MOTWM_XP!.bars!.get(a.id);
    app?.render(true);
  });

  // Re-render XP calculator when award mode setting changes
  Hooks.on("updateSetting", (setting: any, value: any) => {
    if (setting.key === "motwm-xp.awardMode" && window.MOTWM_XP?.calc) {
      const calc = window.MOTWM_XP.calc as any;
      if (calc.element) {
        calc.render(false);
      }
    }
  });
});

// Add the GM calculator button to Token controls
Hooks.on("getSceneControlButtons", (controls: any[]) => {
  if (!game.user?.isGM) return;
  const tokenControl = controls.find(c => c.name === "token");
  tokenControl?.tools?.push({
    name: "motwm-xp-calc",
    title: "Open XP Calculator",
    icon: "fas fa-calculator",
    visible: true,
    onClick: () => {
      if (!window.MOTWM_XP?.calc) window.MOTWM_XP!.calc = new XpCalculatorApp();
      (window.MOTWM_XP!.calc as any).render(true);
    },
    button: true
  });
});