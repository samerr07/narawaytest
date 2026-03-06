/**
 * utils/logger.js — Winston logger
 *
 * Outputs JSON in production (for AWS CloudWatch) and pretty-print in dev.
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
