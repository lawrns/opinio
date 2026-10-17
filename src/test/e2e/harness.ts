/**
 * Local-only end-to-end harness: a throwaway real Postgres, a captured SMTP
 * mail sink and the built standalone Next server. Nothing here can reach a
 * remote database or deliver real mail: Postgres listens on 127.0.0.1 in a
 * temp directory, and the sink accepts every message and stores it in memory.
 */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { Client } from 'pg';
import { applyAuthMigrations } from '../../../scripts/migrate-auth.mjs';

export const ROOT = path.resolve(__dirname, '../../..');

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

export interface TestDatabase {
  url: string;
  client: Client;
  /** Statements the server executed so far (when started with `logStatements`). */
  statements(): string[];
  stop(): Promise<void>;
}

/**
 * Every statement in a Postgres server log, in full. Log entries start with
 * the default `%m [%p] ` timestamp prefix; multi-line SQL continues on
 * tab-indented lines, which belong to the same statement.
 */
export function parseStatements(log: string): string[] {
  return log
    .split(/\n(?=\d{4}-\d\d-\d\d )/)
    .map((entry) => entry.match(/(?:statement|execute [^:]*): ([\s\S]*)$/)?.[1])
    .filter((s): s is string => s !== undefined)
    .map((s) => s.replace(/\n\t/g, '\n').trimEnd());
}

/**
 * Starts an isolated Postgres 16, applies the given repo-relative SQL files,
 * then (with `migrate`) the auth migrations through scripts/migrate-auth.mjs.
 */
export async function startDatabase(
  schemaFiles: string[],
  options: { migrate?: boolean; logStatements?: boolean } = {},
): Promise<TestDatabase> {
  const dir = mkdtempSync(path.join(tmpdir(), 'opinio-pg-'));
  const port = await freePort();
  let log = '';
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(dir, 'data'),
    user: 'opinio_test',
    password: 'opinio_test',
    port,
    persistent: false,
    onLog: (message: string) => {
      if (options.logStatements) log += message;
    },
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('opinio_test');
  const url = `postgres://opinio_test:opinio_test@127.0.0.1:${port}/opinio_test`;
  const client = new Client({ connectionString: url });
  await client.connect();
  for (const file of schemaFiles) {
    await client.query(readFileSync(path.join(ROOT, file), 'utf8'));
  }
  if (options.migrate) await applyAuthMigrations(client);
  if (options.logStatements) {
    await client.query("ALTER DATABASE opinio_test SET log_statement = 'all'");
    // The setting reaches new sessions only; tests also log marker queries on this one.
    await client.query("SET log_statement = 'all'");
  }
  return {
    url,
    client,
    statements: () => parseStatements(log),
    async stop() {
      await client.end().catch(() => {});
      await pg.stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface CapturedMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailSink {
  url: string;
  messages: CapturedMail[];
  /** Resolves with the first message to `to` captured after index `since`. */
  waitFor(to: string, since: number, timeoutMs?: number): Promise<CapturedMail>;
  stop(): Promise<void>;
}

/** A local SMTP server that accepts and records every message. */
export async function startMailSink(): Promise<MailSink> {
  const messages: CapturedMail[] = [];
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS', 'AUTH'],
    logger: false,
    onData(stream, _session, callback) {
      simpleParser(stream)
        .then((mail) => {
          const to = Array.isArray(mail.to) ? mail.to[0]?.text : mail.to?.text;
          messages.push({
            to: to ?? '',
            subject: mail.subject ?? '',
            text: mail.text ?? '',
            html: typeof mail.html === 'string' ? mail.html : '',
          });
          callback();
        })
        .catch(callback);
    },
  });
  const port = await freePort();
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `smtp://127.0.0.1:${port}`,
    messages,
    async waitFor(to, since, timeoutMs = 10_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const found = messages.slice(since).find((m) => m.to.includes(to));
        if (found) return found;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`no mail to ${to} within ${timeoutMs}ms`);
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Runs `next build` into a dedicated dist dir unless it is already built. */
export function buildApp(distDir: string): string {
  const serverJs = path.join(ROOT, distDir, 'standalone', 'server.js');
  if (process.env.OPINIO_E2E_SKIP_BUILD === '1' && existsSync(serverJs)) return serverJs;
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'build'], {
    cwd: ROOT,
    env: { ...process.env, OPINIO_NEXT_DIST_DIR: distDir, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: 'pipe',
  });
  return serverJs;
}

export interface AppServer {
  origin: string;
  /** Everything the server process wrote to stdout and stderr. */
  logs(): string;
  stop(): Promise<void>;
}

/** Starts the built standalone server, exactly as the Dockerfile runs it. */
export async function startApp(
  serverJs: string,
  env: Record<string, string>,
  port?: number,
): Promise<AppServer> {
  port ??= await freePort();
  let output = '';
  const child: ChildProcess = spawn(process.execPath, [serverJs], {
    cwd: path.dirname(serverJs),
    env: {
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (d) => (output += d));
  child.stderr?.on('data', (d) => (output += d));
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      await fetch(`${origin}/robots.txt`);
      break;
    } catch {
      if (Date.now() > deadline || child.exitCode !== null) {
        throw new Error(`app did not start:\n${output}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    origin,
    logs: () => output,
    stop: () =>
      new Promise<void>((resolve) => {
        // Optional evidence capture: OPINIO_E2E_LOG_DIR=<dir> keeps each server's output.
        const logDir = process.env.OPINIO_E2E_LOG_DIR;
        if (logDir) writeFileSync(path.join(logDir, `server-${port}.log`), output);
        if (child.exitCode !== null) return resolve();
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
      }),
  };
}

/** Minimal cookie jar for driving the app over real HTTP. */
export class CookieJar {
  private cookies = new Map<string, string>();
  /** Raw Set-Cookie headers seen, for attribute assertions. */
  readonly setCookies: string[] = [];

  store(res: Response) {
    for (const header of res.headers.getSetCookie()) {
      this.setCookies.push(header);
      const [pair] = header.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '' || /max-age=0/i.test(header) || /expires=thu, 01 jan 1970/i.test(header)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  get(name: string) {
    return this.cookies.get(name);
  }

  set(name: string, value: string) {
    this.cookies.set(name, value);
  }

  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}
