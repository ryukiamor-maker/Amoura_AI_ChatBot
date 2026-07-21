export const BASE_PATH = '/projects/amoura-ai-chatbot'

export function withBasePath(value: string) {
  if (!value.startsWith('/') || value === BASE_PATH || value.startsWith(`${BASE_PATH}/`)) {
    return value
  }
  return `${BASE_PATH}${value}`
}
