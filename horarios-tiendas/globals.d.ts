// Declaraciones de globales para tsc --checkJs.
// Solo lo que vive en archivos NO incluidos en tsconfig.
// Los demás módulos (Store, Utils, CONFIG, Sync, Festivos, Modales,
// CalendarioUI, etc.) los ve tsc directamente desde su .js incluido.
declare const App: any;

// Augmentación pragmática: el código manipula resultados de
// querySelector como si fueran HTMLElement directamente (style, value,
// onclick…) sin cast. Es seguro porque los selectores apuntan a IDs
// concretos que siempre son HTML. Evita cientos de casts ruidosos.
interface Element {
  style: CSSStyleDeclaration;
  value: string;
  onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
  onkeydown: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
  oninput: ((this: GlobalEventHandlers, ev: Event) => any) | null;
  onchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
  focus: () => void;
  blur: () => void;
  click: () => void;
  disabled: boolean;
  checked: boolean;
  dataset: DOMStringMap;
  textContent: string | null;
  innerText: string;
}
