/**
 * Chromium (MV3) background service worker — thin shim that delegates to
 * the shared handler in `@transflow/shared-ext`.
 */
import { startServiceWorker } from "@transflow/shared-ext/background";

startServiceWorker({ chrome, menuLabel: "TransFlow" });
