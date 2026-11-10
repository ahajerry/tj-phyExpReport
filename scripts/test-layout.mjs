// Inspect rendered synthetic PDFs, independently of the template source.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (!args.includes('--inside')) {
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--pdf-dir'), 'Usage: pnpm test:layout [--pdf-dir DIR]')
  const pdfDir = path.resolve(args[1] || 'output/layout-parity/after')
  execFileSync('docker', ['build', '--target', 'layout-qa', '-t', 'phyexp-report:layout-qa', '.'], { stdio: 'inherit' })
  execFileSync('docker', ['run', '--rm', '--network', 'none',
    ...(process.getuid ? ['--user', `${process.getuid()}:${process.getgid()}`] : []),
    '--mount', `type=bind,src=${pdfDir},dst=/reports,readonly`, 'phyexp-report:layout-qa'], { stdio: 'inherit' })
} else {
  const baseline = JSON.parse(readFileSync('/layout-baseline.json', 'utf8'))
  const run = (tool, args) => execFileSync(tool, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
  const extra = readdirSync('/reports', { withFileTypes: true })
    .filter(d => d.isDirectory() && !baseline[d.name] && existsSync(`/reports/${d.name}/report.pdf`)).map(d => d.name)
  for (const id of [...Object.keys(baseline), ...extra]) {
    const reference = baseline[id]
    const pdf = `/reports/${id}/report.pdf`
    const info = run('pdfinfo', [pdf])
    const pageCount = Number(info.match(/Pages:\s+(\d+)/)[1])
    if (reference) assert.equal(pageCount, reference.pages, `${id}: changed page count`)
    assert.match(info, /Page size:\s+595\.27\d x 841\.8\d+ pts/, `${id}: expected A4`)
    const fonts = run('pdffonts', [pdf])
    for (const name of ['FandolSong-Regular', 'FandolHei-Regular', 'LMRoman10-Regular', 'LMRoman12-Bold', 'LatinModernMath']) {
      assert.ok(fonts.includes(name), `${id}: missing embedded font ${name}`)
    }
    assert.doesNotMatch(fonts, /Noto|Libertinus|NewCM/, `${id}: unexpected fallback font`)
    const xml = run('pdftohtml', ['-xml', '-hidden', '-zoom', '1', '-stdout', pdf])
    const pages = [...xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].map(m =>
      [...m[1].matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map(t => ({
        ...attrs(t[1]), text: t[2].replace(/<[^>]*>/g, '').trim(),
      })))
    const anchor = (page, label, expectedY, size) => {
      const item = pages[page].find(t => t.text === label)
      assert.ok(item, `${id}: missing ${label}`)
      assert.ok(Math.abs(Number(item.top) - expectedY) <= 2, `${id}: ${label} shifted vertically`)
      assert.ok(Math.abs(Number(item.left) + Number(item.width) / 2 - 595.276 / 2) <= 2, `${id}: ${label} not centered`)
      const font = [...xml.matchAll(/<fontspec\b([^>]+)\/>/g)].map(m => attrs(m[1])).find(f => f.id === item.font)
      assert.equal(Number(font.size), size, `${id}: wrong title size`)
    }
    if (reference) {
      anchor(0, '物理实验报告', reference.coverTitleY, 36)
      assert.ok(pages[0].some(t => t.text === reference.coverExperiment), `${id}: cover experiment must stay on one line`)
      anchor(1, reference.bodyTitle, reference.bodyTitleY, 14)
      const sectionY = Math.min(...pages[1].filter(t => Number(t.left) >= 89 && Number(t.left) < 92 && Number(t.top) > reference.bodyTitleY + 15).map(t => Number(t.top)))
      assert.ok(Math.abs(sectionY - reference.firstSectionY) <= 2, `${id}: first section spacing changed`)
    }
    // Catch off-page text and formulas. Binding marks are deliberately outside the body margin.
    for (const page of pages) for (const t of page) {
      assert.ok(Number(t.left) >= 0 && Number(t.left) + Number(t.width) <= 596 && Number(t.top) >= 0 && Number(t.top) + Number(t.height) <= 843,
        `${id}: text outside the page: ${t.text}`)
    }
    console.log(`PASS ${id}: ${pageCount} A4 pages, original fonts, ${reference ? 'baseline geometry, ' : ''}page bounds`)
  }
}
