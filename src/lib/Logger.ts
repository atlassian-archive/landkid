import * as winston from 'winston';
import * as path from 'path';

process.stdout.isTTY = true;

const LOG_DIR = path.resolve(process.cwd(), '.logs');

export const Logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: path.resolve(LOG_DIR, 'landkid.error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.resolve(LOG_DIR, 'landkid.log'),
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  Logger.add(
    new winston.transports.Console({
      // format: winston.format.simple(),
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
} else {
  Logger.add(
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  );
}
