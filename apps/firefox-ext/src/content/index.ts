/**
 * Firefox (MV3) content script — installs the WebExtension runtime
 * bridge, then starts the shared orchestrator.
 */
import { createWebExtRuntimeBridge, installPlatform, startContent } from "@transflow/shared-ext";

installPlatform({ runtime: createWebExtRuntimeBridge(chrome) });
startContent();
