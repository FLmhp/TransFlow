/**
 * Safari Web Extension (MV3) background service worker — thin shim that
 * delegates to the shared handler in `@transflow/shared-ext`. Safari's
 * extension API surface mirrors Chromium's `chrome.*` namespace under MV3.
 */
import { startServiceWorker } from "@transflow/shared-ext";

startServiceWorker({ chrome, menuLabel: "TransFlow" });
