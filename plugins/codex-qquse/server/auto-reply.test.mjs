import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createAutoReply } from './auto-reply.mjs';

const THREAD = '11111111-1111-4111-8111-111111111111';

function messageText(parts) {
  return Array.isArray(parts) ? parts.map((part) => part.type === 'text'
    ? String(part.data.text) : part.type === 'at' ? `[@${part.data.qq}]` : '').join('') : '';
}

function message(id, sender, text, mention = false) {
  return {
    message_id: id, time: id, sender: { user_id: sender, nickname: 'Sender' },
    message: [...(mention ? [{ type: 'at', data: { qq: '10001' } }] : []),
      { type: 'text', data: { text } }]
  };
}

async function waitFor(predicate) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('timed out waiting for a queued QQ job');
}

test('queues only new authorized QQ messages into one desktop thread and sends a job once', async () => {
  const root = await fs.mkdtemp(path.join(process.cwd(), '.auto-reply-test-'));
  const previous = process.env.CODEX_QQUSE_AUTOREPLY_STATE;
  process.env.CODEX_QQUSE_AUTOREPLY_STATE = path.join(root, 'auto-reply.json');
  const friendMessages = [message(10, 20001, 'old')];
  const groupMessages = [message(20, 20002, 'old', true)];
  const calls = [];
  const queued = [];
  let receipt = 500;
  const onebot = async (action, params = {}) => {
    calls.push({ action, params });
    if (action === 'get_login_info') return { user_id: 10001 };
    if (action === 'get_friend_list') return [{ user_id: 20001 }];
    if (action === 'get_group_list') return [{ group_id: 30001 }];
    if (action === 'get_friend_msg_history') return { messages: friendMessages };
    if (action === 'get_group_msg_history') return { messages: groupMessages };
    if (action === 'send_private_msg' || action === 'send_group_msg') return { message_id: ++receipt };
    throw new Error(`Unexpected OneBot action: ${action}`);
  };
  const spawnProcess = (_command, args, options) => {
    queued.push({ args, env: options.env });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stdout.resume = () => {};
    child.stderr = new EventEmitter();
    child.stderr.setEncoding = () => {};
    child.kill = () => true;
    setImmediate(() => child.emit('close', 0));
    return child;
  };
  const auto = createAutoReply({
    onebot, assertAllowed: async (_kind, id) => assert.ok(['20001', '30001'].includes(id.text)),
    messageText, ensureGateway: async () => ({ connected: true }), spawnProcess, pollIntervalMs: 10
  });
  try {
    await auto.initialize();
    await assert.rejects(auto.configure({ kind: 'private', targetId: '20001', enabled: true }), /threadId/);
    await auto.configure({ kind: 'private', targetId: '20001', enabled: true, threadId: THREAD,
      agentInstructions: 'Short replies' });
    friendMessages.push(message(11, 20001, 'hello'));
    await waitFor(() => queued.length === 1);
    assert.deepEqual(queued[0].args.slice(0, 3), ['queue', '--thread', THREAD]);
    assert.doesNotMatch(queued[0].args.join(' '), /hello|old/);
    const id = queued[0].args.at(-1).match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/i)[0];
    const job = await auto.getJob(id);
    assert.equal(job.text, 'hello');
    assert.equal(job.agentInstructions, 'Short replies');
    const sent = await auto.sendJob(id, 'Mock reply');
    assert.equal(sent.sent, true);
    const repeated = await auto.sendJob(id, 'Mock reply');
    assert.equal(repeated.alreadySent, true);
    assert.equal(calls.filter((call) => call.action === 'send_private_msg').length, 1);

    await auto.configure({ kind: 'group', targetId: '30001', enabled: true, threadId: THREAD });
    groupMessages.push(message(21, 20002, 'ordinary'), message(22, 20002, 'mentioned', true));
    await waitFor(() => queued.length === 2);
    assert.equal(queued.length, 2);
    await auto.configure({ kind: 'group', targetId: '30001', enabled: false });
    const groupId = queued[1].args.at(-1).match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/i)[0];
    assert.equal((await auto.getJob(groupId)).actionable, false);
    assert.equal((await auto.status()).enabledTargetCount, 1);
  } finally {
    await auto.stop();
    if (previous === undefined) delete process.env.CODEX_QQUSE_AUTOREPLY_STATE;
    else process.env.CODEX_QQUSE_AUTOREPLY_STATE = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
});
