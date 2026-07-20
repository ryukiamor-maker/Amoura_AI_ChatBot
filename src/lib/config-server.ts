import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { migrateChatbotConfig, type ChatbotConfig } from '@/chatbot/schema'

export const chatbotConfigPath = path.join(process.cwd(), 'content/chatbot-config.json')

export async function readChatbotConfig(): Promise<ChatbotConfig> {
  const source = await readFile(chatbotConfigPath, 'utf8')
  return migrateChatbotConfig(JSON.parse(source))
}

export async function writeChatbotConfig(config: unknown): Promise<ChatbotConfig> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('The configuration editor is available in development only.')
  }
  return writeValidatedConfigFile(chatbotConfigPath, config)
}

export async function writeValidatedConfigFile(targetPath: string, config: unknown): Promise<ChatbotConfig> {
  const validated = migrateChatbotConfig(config)
  await mkdir(path.dirname(targetPath), { recursive: true })
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, targetPath)
  return validated
}
