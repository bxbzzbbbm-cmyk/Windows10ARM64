#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, answer => resolve(answer)));
}

(async function main() {
  try {
    let pidInput = await question('Enter PID to stop/kill: ');
    pidInput = pidInput.trim();
    if (!pidInput) {
      console.error('No PID entered. Exiting.');
      process.exitCode = 1;
      rl.close();
      return;
    }

    const pid = Number(pidInput);
    if (!Number.isInteger(pid) || pid <= 0) {
      console.error('Invalid PID. Please provide a positive integer.');
      process.exitCode = 2;
      rl.close();
      return;
    }

    let sigInput = await question('Signal (press Enter for SIGTERM, or type SIGKILL/SIGINT/etc): ');
    sigInput = sigInput.trim();
    const signal = sigInput === '' ? 'SIGTERM' : sigInput;

    try {
      process.kill(pid, signal);
      console.log(`Signal ${signal} sent to PID ${pid} successfully.`);
    } catch (err) {
      if (err.code === 'ESRCH') {
        console.error(`No such process: PID ${pid} does not exist.`);
      } else if (err.code === 'EPERM') {
        console.error(`Permission denied: cannot send ${signal} to PID ${pid}. Try running as an elevated user.`);
      } else if (err.code === 'EINVAL') {
        console.error(`Invalid signal: ${signal}`);
      } else {
        console.error(`Failed to send signal: ${err.message}`);
      }
      process.exitCode = 3;
    }
  } finally {
    rl.close();
  }
})();
