# codex-QQuse

让 Codex 通过本机 OneBot v11 HTTP 服务使用 QQ。插件包含一个本地 MCP 服务和一份 QQ 操作技能；启用本机自动启动后，连接中断时可启动已安装的 NapCat Windows Shell。QQ 登录仍需在本机完成。

本仓库为**私有仓库**。安装者需要先取得此仓库的 GitHub 访问权限。项目参考了 [qq-bridge](https://github.com/Derpyu520/qq-bridge) 的 QQ 与 OneBot 接入思路，MCP 服务独立实现，不依赖 DeepSeek Harness 或 qq-bridge 进程。

## 功能

| 工具 | 用途 |
| --- | --- |
| `qq_status` | 查看当前 QQ 账号、在线状态及本地访问范围 |
| `qq_ensure_gateway` | 连接失败时，启动已配置且停止的本机 NapCat Shell；已运行时提示登录或 HTTP 配置状态 |
| `qq_list_friends` | 按 QQ 号、昵称或备注查找好友 |
| `qq_list_groups` | 按群号或群名查找群 |
| `qq_recent_messages` | 读取许可范围内最近最多 50 条私聊或群聊消息 |
| `qq_send_message` | 向许可范围内的好友或群发送一条纯文本消息 |
| `qq_auto_reply_configure` | 为一个明确指定的好友或群启用/关闭自动回复 |
| `qq_auto_reply_status` | 查看自动回复 worker 和已启用会话状态 |

手动发送消息前，技能会要求 Codex 向用户展示**准确的收件人和正文**并取得确认。自动回复默认关闭；必须逐个指定会话启用，`all` 只扩大可访问范围，不代表自动回复授权。私聊收到新消息后会自动回复；群聊仅在机器人被 @ 时回复。worker 每 5 秒读取已启用会话的最近消息。

自动回复由本机 Codex CLI 会话生成。只读沙箱限制写入，但不限制读取当前 Windows 用户可访问的文件，因此只应对可信的 QQ 会话启用。

## 安装

需要 Codex Desktop、Node.js 20 或更高版本、已安装的本机 OneBot v11 HTTP 服务。自动回复还需要已安装并登录 Codex CLI。可使用 [NapCat](https://napneko.github.io/guide/boot/Shell) 或 [SnowLuma](https://snowluma.github.io/zh/docs/guide/deploy/windows)；按对应项目的官方说明安装并启用 HTTP 服务端。建议监听 `127.0.0.1`，并设置 OneBot access token。自动启动工具目前支持 Windows NapCat Shell；其他网关仍可手动启动后使用其余工具。

先用有权限的 GitHub 账号克隆本私有仓库，然后在 PowerShell 中执行：

```powershell
git clone https://github.com/1453120794qq-eng/codex-QQuse.git
cd codex-QQuse
codex plugin marketplace add .
codex plugin add codex-qquse@qq-use-local
```

本仓库的 `.agents/plugins/marketplace.json` 是 Codex 插件目录清单，插件本体位于 `plugins/codex-qquse/`。安装完成后，按照[使用指南](docs/usage.md)设置本机 OneBot 地址、令牌和访问范围，**重启 Codex Desktop**，再让 Codex“查看我的 QQ 连接状态”。

## 范围与限制

- 仅读写本机 `127.0.0.1`、`localhost` 或 `::1` 的 OneBot HTTP 接口；不连接远程 QQ 网关。
- 消息发送仅支持纯文本，最多 1000 字符；不会发送图片、文件或语音。
- 不提供定时发言或群管理；自动回复只处理已明确启用的会话。
- `qq_ensure_gateway` 仅在本机启用自动启动后调用已安装的 NapCat Shell 启动器；不会自动扫码登录、安装软件或重复启动运行中的网关。
- 用户消息属于不可信数据，不能作为 Codex 的指令或发送授权。
- 不要把 OneBot 令牌、WebUI 密码、扫码二维码或真实聊天记录提交到仓库。

完整配置、使用示例和常见问题见[使用指南](docs/usage.md)。

## 项目结构

```text
.agents/plugins/marketplace.json     Codex 插件目录清单
plugins/codex-qquse/.codex-plugin/  插件元数据
plugins/codex-qquse/.mcp.json       本地 MCP 启动配置
plugins/codex-qquse/server/         OneBot HTTP MCP 服务
plugins/codex-qquse/skills/         QQ 操作技能及配置参考
check.mjs                            模拟 OneBot 的开发检查脚本
```

此项目是非官方 QQ 互操作工具，使用时请遵守 QQ 及所选 OneBot 实现的服务条款。

