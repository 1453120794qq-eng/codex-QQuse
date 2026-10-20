import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createAutoReply } from './auto-reply.mjs';

function messageText(message) {
  if (typeof message === 'string') return message;
  if (!Array.isArray(message)) return '';
  return message.map((segment) => segment?.type === 'text'
    ? String(segment?.data?.text ?? '')
    : segment?.type === 'at' ? `[@${segment?.data?.qq ?? '?'}]` : '[内容]').join('');
}

function textMessage(id, userId, text, { mention = false, time = id } = {}) {
  const message = mention
    ? [{ type: 'at', data: { qq: '10001' } }, { type: 'text', data: { text } }]
    : [{ type: 'text', data: { text } }];
  return {
    message_id: id,
    time,
    sender: { user_id: userId, nickname: `User ${userId}` },
    message
  };
}

function fakeCodex(records) {
  let nextSession = 0;
  return (_command, args, options) => {
    const record = { args: [...args], env: options.env, prompt: '' };
    records.push(record);
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {
      setImmediate(() => child.emit('close', null, 'SIGTERM'));
      return true;
    };

    child.stdin.on('data', (chunk) => { record.prompt += chunk.toString('utf8'); });
    child.stdin.once('finish', async () => {
      try {
        const outputIndex = args.indexOf('-o');
        assert.notEqual(outputIndex, -1, 'Codex CLI receives an output file path');
        const outputPath = args[outputIndex + 1];
        const resumeIndex = args.indexOf('resume');
        const sessionId = resumeIndex >= 0 ? args[resumeIndex + 2] : `mock-thread-${++nextSession}`;
        await fs.writeFile(outputPath, 'Mock reply', 'utf8');
        child.stdout.end(`${JSON.stringify({ type: 'thread.started', thread_id: sessionId })}\n`);
        child.stderr.end();
        child.stdout.once('end', () => child.emit('close', 0, null));
      } catch (error) {
        child.stderr.end(String(error?.stack ?? error));
        child.stdout.end();
        child.stdout.once('end', () => child.emit('close', 1, null));
      }
    });
    return child;
  };
}

async function waitFor(predicate, label, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(`Timed out waiting for ${label}`);
}

test('auto replies only to new direct messages and @mentions, resumes per-chat context, and stops when disabled', async () => {
  const workspace = await fs.realpath(process.cwd());
  const root = await fs.mkdtemp(path.join(workspace, '.auto-reply-test-'));
  assert.ok(root.startsWith(`${workspace}${path.sep}`), 'test data stays inside the repository workspace');
  const envNames = ['CODEX_QQUSE_AUTOREPLY_STATE', 'CODEX_QQUSE_AGENT_WORKDIR', 'CODEX_QQUSE_TOKEN'];
  const originalEnv = new Map(envNames.map((name) => [name, process.env[name]]));
  process.env.CODEX_QQUSE_AUTOREPLY_STATE = path.join(root, 'state', 'auto-reply.json');
  process.env.CODEX_QQUSE_AGENT_WORKDIR = path.join(root, 'workspace');
  process.env.CODEX_QQUSE_TOKEN = 'must-not-reach-agent';

  const friendMessages = [textMessage(10, 20001, 'old message')];
  const groupMessages = [textMessage(20, 20002, 'old mention', { mention: true })];
  const calls = [];
  const cliRuns = [];
  let sentMessageId = 500;
  const onebot = async (action, params = {}) => {
    calls.push({ action, params });
    switch (action) {
      case 'get_login_info': return { user_id: 10001, nickname: 'Mock Bot' };
      case 'get_friend_list': return [{ user_id: 20001, nickname: 'Alice' }];
      case 'get_group_list': return [{ group_id: 30001, group_name: 'Mock Group' }];
      case 'get_friend_msg_history': return { messages: friendMessages };
      case 'get_group_msg_history': return { messages: groupMessages };
      case 'send_private_msg':
      case 'send_group_msg': return { message_id: ++sentMessageId };
      default: throw new Error(`Unexpected OneBot action: ${action}`);
    }
  };
  const autoReply = createAutoReply({
    onebot,
    assertAllowed: async (_kind, id) => {
      assert.ok(['20001', '30001'].includes(id.text), 'only the configured test targets are allowed');
    },
    messageText,
    ensureGateway: async () => ({ connected: true }),
    spawnProcess: fakeCodex(cliRuns),
    pollIntervalMs: 10
  });

  try {
    await autoReply.initialize();
    const privateConfig = await autoReply.configure({
      kind: 'private', targetId: '20001', enabled: true,
      codexProfile: 'test-profile', agentInstructions: 'Keep replies brief.'
    });
    assert.equal(privateConfig.enabled, true);
    assert.equal(privateConfig.groupRequiresMention, false);

    friendMessages.push(textMessage(11, 20001, 'new direct message'));
    await waitFor(() => calls.some((call) => call.action === 'send_private_msg'), 'private reply');
    assert.deepEqual(calls.filter((call) => call.action === 'send_private_msg').at(-1).params.message,
      [{ type: 'text', data: { text: 'Mock reply' } }]);
    assert.equal(cliRuns[0].env.CODEX_QQUSE_TOKEN, undefined, 'OneBot token is not passed to the Codex child');
    assert.ok(cliRuns[0].args.includes('--profile') && cliRuns[0].args.includes('test-profile'));
    assert.match(cliRuns[0].prompt, /new direct message/);
    assert.doesNotMatch(cliRuns[0].prompt, /old message/);

    friendMessages.push(textMessage(12, 20001, 'follow-up'));
    await waitFor(() => calls.filter((call) => call.action === 'send_private_msg').length === 2,
      'private follow-up reply');
    assert.ok(cliRuns[1].args.includes('resume'));
    assert.ok(cliRuns[1].args.includes('mock-thread-1'), 'the second message resumes the private chat context');

    const groupConfig = await autoReply.configure({ kind: 'group', targetId: '30001', enabled: true });
    assert.equal(groupConfig.groupRequiresMention, true);
    groupMessages.push(
      textMessage(21, 20002, 'ordinary group message'),
      textMessage(22, 20002, 'bot please answer', { mention: true })
    );
    await waitFor(() => calls.some((call) => call.action === 'send_group_msg'), 'group @mention reply');
    assert.equal(calls.filter((call) => call.action === 'send_group_msg').length, 1,
      'the ordinary group message and the pre-enable message are ignored');
    assert.equal(calls.find((call) => call.action === 'send_group_msg').params.group_id, 30001);

    await autoReply.configure({ kind: 'group', targetId: '30001', enabled: false });
    groupMessages.push(textMessage(23, 20002, 'after disable', { mention: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(calls.filter((call) => call.action === 'send_group_msg').length, 1,
      'disabled targets do not receive later replies');
    assert.equal(autoReply.status().enabledTargetCount, 1, 'only the still-enabled private chat remains active');
  } finally {
    await autoReply.stop();
    for (const [name, value] of originalEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});
