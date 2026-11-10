// Real Typst integration tests; all report data is synthetic.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { root } from './backend.mjs'

const options = new Map()
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 2) {
  if (!['--font-dir', '--output', '--run'].includes(args[i]) || !args[i + 1]) {
    throw new Error('Usage: pnpm test:render [--font-dir DIR] [--output DIR] [--run PATTERN]')
  }
  options.set(args[i], args[i + 1])
}
const fontDir = options.get('--font-dir') || process.env.REPORT_FONT_DIR || path.join(root, 'typst/fonts')
const fonts = spawnSync('typst', ['fonts', ...(fontDir ? ['--ignore-system-fonts', '--font-path', path.resolve(fontDir)] : [])], { encoding: 'utf8' })
if (fonts.error) throw fonts.error
for (const name of ["FandolSong", "FandolHei", "Latin Modern Roman", "Latin Modern Roman 9", "Latin Modern Roman 12", "Latin Modern Math"]) {
  if (fonts.status !== 0 || !fonts.stdout.split(/\r?\n/).includes(name)) throw new Error(`缺少字体 ${name}；请使用仓库 typst/fonts 或通过 --font-dir 指定同版本字体目录。`)
}
const output = options.get('--output')
const result = spawnSync('go', ['-C', 'server', 'test', './internal/render', '-count=1', ...(options.has('--run') ? ['-run', options.get('--run')] : [])], {
  cwd: root, stdio: 'inherit', env: { ...process.env, REPORT_TEST_PDF: '1',
    REPORT_FONT_DIR: fontDir ? path.resolve(fontDir) : '',
    ...(output ? { REPORT_TEST_OUTPUT: path.resolve(output) } : {}) },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
