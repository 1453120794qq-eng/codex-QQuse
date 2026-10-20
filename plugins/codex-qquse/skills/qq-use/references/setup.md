# Local setup

`codex-QQuse` needs a local OneBot v11 HTTP service and a logged-in QQ account. It can start an existing NapCat Windows Shell installation when the user enables auto-start; it does not install NapCat, perform QQ login or scan QR codes. The configured HTTP endpoint normally is `http://127.0.0.1:3000/`.

Configure these **user environment variables on the computer running Codex**, then restart the desktop app or start a new Codex process:

| Variable | Meaning |
| --- | --- |
| `CODEX_QQUSE_HTTP_URL` | OneBot HTTP base URL; default `http://127.0.0.1:3000`. Only loopback HTTP endpoints are accepted. |
| `CODEX_QQUSE_TOKEN` | OneBot access token, if configured. Set it locally; do not paste it into chat or a tracked file. |
| `CODEX_QQUSE_GROUPS` | Comma-separated group IDs allowed for reading history and sending, or `all` for every group the account currently belongs to. |
| `CODEX_QQUSE_USERS` | Comma-separated QQ friend IDs allowed for reading history and sending, or `all` for every current friend. |
| `CODEX_QQUSE_AUTO_START` | Set to `1` to allow `qq_ensure_gateway` to start local NapCat Shell when stopped. |
| `CODEX_QQUSE_NAPCAT_ROOT` | Absolute path to the existing NapCat Windows Shell directory. |
| `CODEX_QQUSE_QQ_EXE` | Absolute path to the installed `QQ.exe`. |
| `CODEX_QQUSE_QQ_ID` | QQ account number passed to NapCat Shell at launch. |

An empty scope denies history reads and sends for that type. With `all`, the plugin checks current membership in the friend or group list before each read or send. Contact and group listings remain available to help identify IDs. Restrict access to the local account and to the OneBot HTTP port; the plugin forwards the token only to a loopback endpoint.

After restarting Codex, call `qq_status`. If it reports `fetch failed`, call `qq_ensure_gateway` once. If NapCat is running but QQ is not logged in, finish login in the local NapCat WebUI or QQ window. If it reports HTTP 401/403, check the local token; HTTP 426 means the configured endpoint is not the OneBot HTTP port. The plugin does not need port 3001. If a history action is unsupported by a different OneBot implementation, the tool will report that action's failure.

Sources: [NapCat Shell startup](https://napneko.github.io/guide/boot/Shell), [NapCat HTTP configuration](https://napneko.github.io/config/basic), [qq-bridge OneBot caller](https://github.com/Derpyu520/qq-bridge/blob/main/src/mcp-snowluma-safe.js#L80-L97).
