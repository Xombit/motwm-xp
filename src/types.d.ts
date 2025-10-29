// Minimal type declarations for Foundry VTT
// These are provided by Foundry at runtime

declare global {
  const game: any;
  const CONFIG: any;
  const CONST: any;
  const canvas: any;
  const ui: any;
  const Hooks: any;
  const mergeObject: any;
  
  class Application {
    constructor(options?: any);
    static get defaultOptions(): any;
    getData(): any;
    activateListeners(html: JQuery): void;
    render(force?: boolean): any;
  }
  
  class Actor {
    [key: string]: any;
  }
  
  interface JQuery {
    on(events: string, selector: string, handler: Function): JQuery;
    on(events: string, handler: Function): JQuery;
    find(selector: string): JQuery;
    [key: string]: any;
  }
}

export {};