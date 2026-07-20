import configJson from '../content/chatbot-config.json'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { writeValidatedConfigFile } from '@/lib/config-server'

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { force: true, recursive: true }))))

describe('atomic configuration storage', () => {
  it('validates and renames a temporary file without leaving artifacts', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'portable-chatbot-'))
    directories.push(directory)
    const target = path.join(directory, 'config.json')
    await writeValidatedConfigFile(target, configJson)
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual(configJson)
    expect(await readdir(directory)).toEqual(['config.json'])
  })

  it('does not write invalid input', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'portable-chatbot-'))
    directories.push(directory)
    await expect(writeValidatedConfigFile(path.join(directory, 'config.json'), { version: 1 })).rejects.toThrow()
    expect(await readdir(directory)).toEqual([])
  })
})
