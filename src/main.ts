import { registerSettings } from "./settings";
import { XpCalculatorApp } from "./ui/XpCalculatorApp";
import { XpBarApp } from "./ui/XpBarApp";
import "./styles/styles.css";

function createCalculatorTool() {
  // Include both onClick (v11/v12) and onChange (v13+) — each version ignores the other.
  // Avoids version branching which can misfire when version detection is unreliable at hook time.
  return {
    name: "motwm-xp-calc",
    title: "Open XP Calculator",
    icon: "fas fa-calculator",
    visible: true,
    order: 99,
    button: true,
    onClick: () => openCalculator(),
    onChange: () => openCalculator(),
  };
}

declare global {
  interface Window {
    MOTWM_XP?: {
      calc?: XpCalculatorApp;
      bars?: Map<string, XpBarApp>;
      XpBarApp?: typeof XpBarApp;
    };
  }
}

function resolveCurrentUserActor(): Actor | undefined {
  const ref = (game.user as any)?.character;
  if (!ref) return undefined;
  if (typeof ref === "string") return game.actors?.get(ref) as Actor | undefined;
  return ref as Actor;
}

function ensurePlayerBar(): boolean {
  window.MOTWM_XP = window.MOTWM_XP ?? { bars: new Map() };
  const bars = window.MOTWM_XP.bars ?? new Map<string, XpBarApp>();
  window.MOTWM_XP.bars = bars;

  const show = game.settings.get("motwm-xp", "showPlayerBar") as boolean;
  if (!show) return false;

  const actor = resolveCurrentUserActor();
  if (!actor?.id) {
    for (const app of bars.values()) {
      void app.close();
    }
    bars.clear();
    return false;
  }

  let app = bars.get(actor.id);
  if (!app) {
    app = new XpBarApp(actor, { top: window.innerHeight - 54, left: 0 });
    bars.set(actor.id, app);
  } else {
    app.actor = actor;
  }

  app.render(true);
  return true;
}

Hooks.once("init", () => {
  registerSettings();
  window.MOTWM_XP = window.MOTWM_XP ?? { bars: new Map() };
  // Store XpBarApp class for the onChange callback
  window.MOTWM_XP.XpBarApp = XpBarApp;
});

Hooks.once("ready", () => {
  // Player XP bar: each user sees their own assigned character (if any)
  ensurePlayerBar();

  const getApplicationsTheme = (uiConfig: any): "dark" | "light" | undefined => {
    const scheme = uiConfig?.colorScheme?.applications;
    return scheme === "dark" || scheme === "light" ? scheme : undefined;
  };

  let lastAppliedTheme: "dark" | "light" | undefined;
  const applyCalculatorTheme = (explicitTheme?: "dark" | "light") => {
    const calc = window.MOTWM_XP?.calc as any;
    if (!calc?._applyThemeClass) return;
    if (explicitTheme && explicitTheme === lastAppliedTheme) return;
    calc._applyThemeClass(explicitTheme);
    if (explicitTheme) lastAppliedTheme = explicitTheme;
  };

  // Re-render my bar if my actor's XP/level changes
  Hooks.on("updateActor", (actor: Actor, changes: any) => {
    const a = resolveCurrentUserActor();
    if (!a || actor.id !== a.id) return;
    const app = window.MOTWM_XP!.bars!.get(a.id);
    app?.render(true);
  });

  // Preferred v13+ signal: client-side setting changes include payload values.
  Hooks.on("clientSettingChanged", (...args: any[]) => {
    const key = typeof args[0] === "string" ? args[0] : String(args[0]?.key ?? "");
    if (key !== "core.uiConfig" && !key.startsWith("core.uiConfig.")) return;
    const explicitTheme =
      getApplicationsTheme(args[2]) ??
      getApplicationsTheme(args[1]) ??
      getApplicationsTheme(args[0]?.value);
    applyCalculatorTheme(explicitTheme);
  });

  // Compatibility fallback for versions/modules that surface updateSetting.
  Hooks.on("updateSetting", (setting: any, value: any) => {
    const key = String(setting?.key ?? "");
    if (key !== "core.uiConfig" && !key.startsWith("core.uiConfig.")) return;
    const explicitTheme =
      getApplicationsTheme(value) ??
      getApplicationsTheme(setting?.value) ??
      getApplicationsTheme(setting?.data?.value);
    applyCalculatorTheme(explicitTheme);
  });
});

function openCalculator() {
  if (!window.MOTWM_XP?.calc) window.MOTWM_XP!.calc = new XpCalculatorApp();
  (window.MOTWM_XP!.calc as any).render(true);
}

function addCalculatorToolToArrayControls(controls: any[]) {
  const tokenControl = controls.find(c => c?.name === "token" || c?.name === "tokens");
  if (!tokenControl) return;

  if (!Array.isArray(tokenControl.tools)) tokenControl.tools = [];
  if (tokenControl.tools.some((t: any) => t?.name === "motwm-xp-calc")) return;

  tokenControl.tools.push(createCalculatorTool());
}

function addCalculatorToolToObjectControls(controls: Record<string, any>) {
  const tokenControl =
    controls?.token ??
    controls?.tokens ??
    Object.values(controls ?? {}).find(
      (c: any) => c?.name === "token" || c?.name === "tokens"
    );
  if (!tokenControl) return;

  if (!tokenControl.tools || Array.isArray(tokenControl.tools)) tokenControl.tools = {};
  if (tokenControl.tools["motwm-xp-calc"]) return;

  tokenControl.tools["motwm-xp-calc"] = createCalculatorTool();
}

// Add the GM calculator button to Token controls
Hooks.on("getSceneControlButtons", (controls: any) => {
  if (!game.user?.isGM) return;
  if (Array.isArray(controls)) {
    addCalculatorToolToArrayControls(controls);
    return;
  }
  if (controls && typeof controls === "object") {
    addCalculatorToolToObjectControls(controls as Record<string, any>);
  }
});