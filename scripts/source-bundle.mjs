// Test helper for the small, non-ZIP64 archives produced by archive/zip.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

export async function extractSource(zip, destination) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  assert.ok(end >= 0 && end + 22 === zip.length, 'ZIP end record')
  assert.equal(zip.readUInt16LE(end + 4), 0, 'single disk')
  const count = zip.readUInt16LE(end + 10)
  assert.ok(count > 0 && count <= 100, 'bounded entry count')
  let offset = zip.readUInt32LE(end + 16)
  let total = 0
  const names = new Set()
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50, 'central directory entry')
    assert.equal(zip.readUInt16LE(offset + 8) & 1, 0, 'unencrypted source')
    assert.equal(zip.readUInt16LE(offset + 10), 8, 'deflated source')
    const compressed = zip.readUInt32LE(offset + 20)
    const size = zip.readUInt32LE(offset + 24)
    const nameLength = zip.readUInt16LE(offset + 28)
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    assert.match(name, /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:typ|json|md|png|jpe?g)$/)
    assert.ok(!names.has(name), 'unique file names')
    assert.ok(!name.endsWith('.pdf'), 'source only')
    names.add(name)
    total += size
    assert.ok(total <= 128 * 1024 * 1024, 'bounded source size')
    const local = zip.readUInt32LE(offset + 42)
    assert.equal(zip.readUInt32LE(local), 0x04034b50, 'local entry')
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
    const data = inflateRawSync(zip.subarray(start, start + compressed), { maxOutputLength: size || 1 })
    assert.equal(data.length, size)
    const target = path.join(destination, name)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, data)
    offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32)
  }
  for (const name of ['report.typ', 'base.typ', 'charts.typ', 'data.json', 'README.md', 'tongji_logo.jpeg']) {
    assert.ok(names.has(name), `missing ${name}`)
  }
  return [...names]
}
