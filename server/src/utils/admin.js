/* eslint-disable no-console -- CLI tool: console output is the interface. */
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/index.js';
import { ADMIN_PASSWORD_MIN, upsertAdmin } from '../services/auth/bootstrapAdmin.js';

/**
 * Admin accounts for the verification desk, written straight to the MongoDB in MONGO_URI
 * (server/.env or the environment):
 *
 *   npm run admin -- create you@example.com            → asks for the password (hidden)
 *   npm run admin -- create you@example.com "Your Name"
 *   npm run admin -- list
 *   npm run admin -- disable you@example.com            → blocks that admin's login
 *
 * `create` on an existing admin resets its password. The password is typed, never passed as
 * an argument, so it doesn't end up in shell history. ADMIN_PASSWORD (env) is used instead
 * when set, for non-interactive use.
 */
const USAGE = `Usage:
  npm run admin -- create <email> ["Full Name"]   (prompts for the password)
  npm run admin -- list
  npm run admin -- disable <email>`;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : s.replace(/[^\r\n]/g, '*'));
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY)
    throw new Error('No terminal to type the password in — set ADMIN_PASSWORD for this command.');
  const first = await ask(`Password (${ADMIN_PASSWORD_MIN}+ characters): `, { hidden: true });
  const second = await ask('Repeat password: ', { hidden: true });
  if (first !== second) throw new Error('Passwords do not match.');
  return first;
}

export async function run([command, email, ...rest], { password } = {}) {
  switch (command) {
    case 'create': {
      if (!email) throw new Error(USAGE);
      const result = await upsertAdmin({
        email,
        password: password ?? (await readPassword()),
        name: rest.join(' ') || undefined,
      });
      return console.log(
        `\nAdmin ${email.toLowerCase()} ${result}. Sign in on the normal login page → /admin/verifications\n`
      );
    }
    case 'list': {
      const admins = await User.find({ role: ROLES.ADMIN }).sort({ createdAt: 1 });
      if (!admins.length) return console.log('\nNo admin accounts yet.\n');
      return console.log(
        `\n${admins.map((a) => `${a.email}  ${a.name}  ${a.isActive ? 'active' : 'DISABLED'}`).join('\n')}\n`
      );
    }
    case 'disable': {
      if (!email) throw new Error(USAGE);
      const res = await User.updateOne(
        { email: email.toLowerCase(), role: ROLES.ADMIN },
        { $set: { isActive: false } }
      );
      if (!res.matchedCount) throw new Error(`No admin with email ${email}`);
      return console.log(`\nAdmin ${email.toLowerCase()} disabled.\n`);
    }
    default:
      throw new Error(USAGE);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(() => run(process.argv.slice(2)))
    .catch((err) => {
      console.error(`\n${err.message}\n`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB().catch(() => {}));
}
