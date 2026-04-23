/**
 * Firefox (MV3) background script — thin shim that delegates to the shared
 * handler in `@transflow/shared-ext`. Firefox exposes the same `chrome.*`
 * and `browser.*` namespaces for MV3 extensions; we use `chrome.*` for a
 * single code path across Chromium/Firefox/Safari.
 */
import { startServiceWorker } from "@transflow/shared-ext/background";

startServiceWorker({ chrome, menuLabel: "TransFlow" });
