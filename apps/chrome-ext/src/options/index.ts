import { createWebExtUiBridge, installPlatform, startOptions } from "@transflow/shared-ext";

installPlatform({ ui: createWebExtUiBridge(chrome) });
startOptions();
