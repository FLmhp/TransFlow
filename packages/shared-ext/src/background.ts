/**
 * Background-only entry point for `@transflow/shared-ext`.
 *
 * This subpath export exists so WebExtension service workers can import
 * the background handler without transitively pulling in content-script
 * modules that `import $ from "jquery"` at the top level. jQuery's ESM
 * build evaluates `jQueryFactory(window, true);` as a side effect, which
 * throws `ReferenceError: window is not defined` in a service worker and
 * kills the worker before it can register any message listeners.
 *
 * Consumers should use `import { startServiceWorker } from
 * "@transflow/shared-ext/background";` in their background shim.
 */
export { startServiceWorker, type ServiceWorkerOptions } from "./background/service-worker.js";
