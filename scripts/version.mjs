import { readFile, writeFile } from 'node:fs/promises'

const packagePath = new URL('../package.json', import.meta.url)
const requested = process.argv[2]

function parseRelease(label) {
  const match = /^v(\d{2})(\d{2})(\d{2})\.([1-9]\d*)$/.exec(label)
  if (!match) throw new Error('版本号应为 vYYMMDD.N，例如 v261003.1')
  const [, year, month, day, sequence] = match
  const date = new Date(Date.UTC(2000 + Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== 2000 + Number(year) ||
      date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) {
    throw new Error(`日期无效：${year}${month}${day}`)
  }
  return `${year}${month}${day}.${sequence}.0`
}

function releaseLabel(packageVersion) {
  const match = /^(\d{6})\.([1-9]\d*)\.0$/.exec(packageVersion)
  if (!match) throw new Error(`包版本号与项目规则不符：${packageVersion}`)
  return `v${match[1]}.${match[2]}`
}

async function readJson(url) {
  const source = await readFile(url, 'utf8')
  return { data: JSON.parse(source), newline: source.includes('\r\n') ? '\r\n' : '\n' }
}

async function saveJson(url, value) {
  await writeFile(url, JSON.stringify(value.data, null, 2).replaceAll('\n', value.newline) + value.newline)
}

const packageFile = await readJson(packagePath)

if (requested) {
  const packageVersion = parseRelease(requested)
  packageFile.data.version = packageVersion
  await saveJson(packagePath, packageFile)
}

const packageVersion = packageFile.data.version
console.log(`${releaseLabel(packageVersion)}（SemVer ${packageVersion}）`)
