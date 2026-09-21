import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const prompt = createInterface({ input: stdin, output: stdout });
const password = await prompt.question('Admin password: ');
prompt.close();

if (password.length < 14) {
  throw new Error('Use an admin password with at least 14 characters.');
}

console.log(await bcrypt.hash(password, 12));
