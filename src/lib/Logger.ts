import * as winston from 'winston';

process.stdout.isTTY = true;

const ProdLogger = winston.createLogger({
  level: 'http',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const DevLogger = winston.createLogger({
  level: 'verbose',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
      ({ level, message, namespace, ...info }) =>
        `${level}: ${namespace ? `[${namespace}] ` : ''}${message} ${JSON.stringify(info)}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

export const Logger = process.env.NODE_ENV === 'production' ? ProdLogger : DevLogger;
