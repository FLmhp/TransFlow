# @transflow/safari-ext

Safari Web Extension (MV3) build of TransFlow.

## Building

```sh
pnpm --filter @transflow/safari-ext build
# → apps/safari-ext/dist/transflow-safari.zip
```

## Loading into Safari

Safari requires extensions to be packaged as a native Safari App Extension
project via Apple's toolchain. Convert the built `dist/` folder with:

```sh
xcrun safari-web-extension-converter apps/safari-ext/dist
```

This produces an Xcode project. Open it, build & run the companion app, then
enable the extension in **Safari → Settings → Extensions**. See
[Apple's documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
for signing & distribution.

The source under `src/` is a thin shim: all translation logic, UI and
content-script modules live in `@transflow/shared-ext` and are shared with
the Chromium and Firefox targets.
