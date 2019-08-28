import * as winston from 'winston';

process.stdout.isTTY = true;

const ProdLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
const DevelopmentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

const LoggerToExport = process.env.NODE_ENV === 'production' ? ProdLogger : DevelopmentLogger;

export const Logger = LoggerToExport;
