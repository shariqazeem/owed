// pm2 on the VM. Node 22 is what the Strands SDK needs and what nvm installed; pm2 itself runs on the system node.
const node = "/home/ubuntu/.nvm/versions/node/v22.23.2/bin/node";
module.exports = {
  apps: [
    { name: "owed", cwd: __dirname, script: "node_modules/next/dist/bin/next", args: "start -p 3100", interpreter: node, env: { NODE_ENV: "production" }, max_memory_restart: "700M" },
    // the background: nudges, up to three per person, then a decision for the owner
    { name: "owed-sweep", cwd: __dirname, script: "node_modules/tsx/dist/cli.mjs", args: "--env-file=.env scripts/sweep.ts", interpreter: node, cron_restart: "0 */4 * * *", autorestart: false },
  ],
};
