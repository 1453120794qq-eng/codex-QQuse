# Local setup

`codex-QQuse` needs SnowLuma or a compatible OneBot v11 HTTP service already running and logged in to QQ. It does not install, start or manage the QQ client. SnowLuma's documented default HTTP endpoint is `http://127.0.0.1:3000`.

Configure these **user environment variables on the computer running Codex**, then restart the desktop app or start a new Codex process:

| Variable | Meaning |
| --- | --- |
| `CODEX_QQUSE_HTTP_URL` | OneBot HTTP base URL; default `http://127.0.0.1:3000`. Only loopback HTTP endpoints are accepted. |
| `CODEX_QQUSE_TOKEN` | OneBot access token, if configured. Set it locally; do not paste it into chat or a tracked file. |
| `CODEX_QQUSE_GROUPS` | Comma-separated group IDs allowed for reading history and sending, or `all` for every group the account currently belongs to. |
| `CODEX_QQUSE_USERS` | Comma-separated QQ friend IDs allowed for reading history and sending, or `all` for every current friend. |

An empty scope denies history reads and sends for that type. With `all`, the plugin checks current membership in the friend or group list before each read or send. Contact and group listings remain available to help identify IDs. Restrict access to the local account and to the OneBot HTTP port; the plugin forwards the token only to a loopback endpoint.

After restarting Codex, call `qq_status`. If it reports HTTP 401, check the local token. HTTP 426 usually means the WebSocket port was used as the HTTP URL; SnowLuma commonly uses port 3001 for WebSocket and port 3000 for HTTP. If a history action is unsupported by a different OneBot implementation, the tool will report that action's failure.

Sources: [SnowLuma HTTP API](https://snowluma.github.io/en/docs/api), [qq-bridge OneBot caller](https://github.com/Derpyu520/qq-bridge/blob/main/src/mcp-snowluma-safe.js#L80-L97).
