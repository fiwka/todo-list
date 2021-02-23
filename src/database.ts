import * as sequelize from 'sequelize'
import * as config from './config.json'
import * as models from './models'
import { logger } from './logger'

export const database = new sequelize.Sequelize(
  config.dbName,
  config.dbUser,
  config.dbPassword,
  {
    host: config.dbHost,
    dialect: 'mysql',
    logging: logger.info
  }
)

export async function tryConnect () {
  try {
    await database.authenticate()
    logger.info('Connection to database successfuly!')
  } catch (ex) {
    logger.error('Unable to connect to the database:\n' + ex)
  }
}
