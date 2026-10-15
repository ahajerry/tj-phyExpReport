const agent = process.env.npm_config_user_agent || ''
if (!agent.startsWith('pnpm/')) {
  console.error('本项目仅使用 pnpm。请执行 corepack enable，再执行 pnpm install --frozen-lockfile。')
  process.exit(1)
}
