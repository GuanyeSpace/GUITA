import { randomBytes } from 'node:crypto'

export const BASE32 = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

const GUITA_ID_PREFIX = 'GT'
const GUITA_ID_BODY_LENGTH = 12
const GUITA_ID_PATTERN = /^GT[A-Z2-9]{12}$/
const BASE32_CHARACTERS = new Set(BASE32.split(''))

export function generateGuitaId() {
  const suffix = Array.from(randomBytes(GUITA_ID_BODY_LENGTH), (byte) => BASE32[byte % BASE32.length]).join('')

  return `${GUITA_ID_PREFIX}${suffix}`
}

export function isValidGuitaId(id: string) {
  if (!GUITA_ID_PATTERN.test(id)) {
    return false
  }

  return id
    .slice(GUITA_ID_PREFIX.length)
    .split('')
    .every((character) => BASE32_CHARACTERS.has(character))
}
