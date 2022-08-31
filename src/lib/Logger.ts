import winston from 'winston';
import { isMatch } from 'micromatch';

process.stdout.isTTY = true;

const ProdLogger = winston.createLogger({
  level: 'http',
  format: winston.format.json(),
  transports: [new winston.transports.Console(), new (winston.transports.File)({
    name: 'info-file',
    filename: 'info-file.log',
    level: 'info'
  })],
});

const DevLogger = winston.createLogger({
  level: 'verbose',
  format: winston.format.combine(
    winston.format((log) =>
      process.env.LOG_NAMESPACES && !isMatch(log.namespace || '', process.env.LOG_NAMESPACES)
        ? false
        : log,
    )(),
    winston.format.colorize(),
    winston.format.printf(
      ({ level, message, namespace, ...info }) =>
        `${level}: ${namespace ? `[${namespace}] ` : ''}${message} ${JSON.stringify(info)}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

export const Logger = process.env.NODE_ENV === 'production' ? ProdLogger : DevLogger;
