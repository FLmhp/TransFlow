import { createWebExtUiBridge, installPlatform, startPopup } from "@transflow/shared-ext";

installPlatform({ ui: createWebExtUiBridge(chrome) });
startPopup();
