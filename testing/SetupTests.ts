import * as dotenv from 'dotenv'
import { existsSync } from 'fs'
import * as path from 'path'

const pathLocal = path.join(__dirname, './.env.test.local')
if (existsSync(pathLocal)) {
  dotenv.config({ path: pathLocal })
} else {
  dotenv.config({ path: path.join(__dirname, './.env.test') })
}

jest.setTimeout(30000) // in milliseconds
