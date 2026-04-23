import { render } from "solid-js/web";
import { App } from "./App.jsx";
import { initSettings } from "../shared/settings-store.js";
import "./styles.js";

export function startOptions(): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("#root not found");
  void initSettings();
  render(() => <App />, root);
}

export { App };
