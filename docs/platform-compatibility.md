# Platform compatibility

The editor runs inside the Standard Notes component iframe on web, desktop, and mobile. All three hosts speak the same `postMessage` protocol, but they load the component from different origins.

| Host | Component origin | Parent origin | Notes |
| --- | --- | --- | --- |
| Web | `https://jtlimo.github.io` | `https://app.standardnotes.com` | Regular HTTP origin. |
| Desktop | `file://` | `file://` | Electron loads the component from the local `index.html`. |
| Mobile | `file:///android_asset/Web.bundle/src/index.html` | `file://` | Android WebView loads the bundled component. |

## Why the official editor-kit failed

`@standardnotes/editor-kit` replies to the parent using `parent.postMessage(message, component.origin)`, where `component.origin` is taken from the incoming `message` event. On `file://` pages the browser reports that origin as the opaque string `"null"`.

`postMessage(message, "null")` is not a valid target origin, so the browser throws:

```
SyntaxError: Invalid target origin 'null'
```

The exception aborts `onReady` before the editor sends `stream-context-item`, so the host never delivers the note, `setEditorRawText` is never called, and the editor stays blank on desktop and mobile.

The kit also drops messages when `document.referrer` does not match the event origin, which is unreliable for opaque origins.

## Local relay

`src/sn/component-relay.ts` replaces the kit with the minimum protocol needed by this editor:

- Always posts with `targetOrigin: '*'`. The session key issued in `component-registered` authenticates messages, so a wildcard target origin is safe here.
- Does not filter incoming messages by `document.referrer` or `event.origin`.
- Serializes outgoing messages as JSON on mobile, matching the host expectation.
- Queues messages until `component-registered` arrives.
- Forwards themes to the document and notifies the editor to refresh its theme.
- Sends `save-items` with `preview_plain` and `preview_html` so the note list stays up to date.

`src/sn/bridge.ts` builds the editor-facing API on top of the relay:

- `registered` resolves as soon as the host accepts the component, so the UI mounts immediately.
- `ready` resolves when the first note arrives.
- Note text, lock state, settings, previews, and component data are read and written through the relay.

## Verification

1. `pnpm test` covers opaque-origin registration, the `registered` gate, saving with previews, and component data.
2. `pnpm build` produces `dist/index.html` and `dist/latest.zip`.
3. Serve `dist/` over `file://` in Chromium, open it inside a parent page loaded from `file://`, and confirm the editor mounts and renders a note. The local harness in `src/demo` can act as the parent during development.

## Known unrelated issue

The published bundle logs an internal `SyntaxError: Invalid or unexpected token` on some hosts. It does not affect registration or rendering and is outside this fix.
