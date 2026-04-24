/**
 * Firefox (MV3) bundled PDF viewer entry point — installs the
 * WebExtension runtime bridge and starts the shared viewer bootstrap
 * from `@transflow/shared-ext`.
 */
import { createWebExtRuntimeBridge, installPlatform, startPdfViewer } from "@transflow/shared-ext";

installPlatform({ runtime: createWebExtRuntimeBridge(chrome) });
void startPdfViewer({ chrome });
