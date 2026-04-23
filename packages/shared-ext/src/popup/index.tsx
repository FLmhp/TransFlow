import { render } from "solid-js/web";
import { App } from "./App.jsx";
import { initSettings } from "../shared/settings-store.js";
import "./styles.js";

/**
 * Mount the popup UI. Each target is responsible for installing the UI
 * bridge (via `installPlatform`) and calling this function after
 * the DOM is ready.
 */
export function startPopup(): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("#root not found");
  void initSettings();
  render(() => <App />, root);
}

export { App };
