import { randomBytes } from 'node:crypto';

// Run locally and save the output in a password manager and Vercel secrets.
process.stdout.write(`${randomBytes(32).toString('base64url')}\n`);
