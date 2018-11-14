import * as bunyan from 'bunyan';
import * as path from 'path';

const LOG_PATH = path.resolve(process.cwd(), 'landkid.log');

const Logger = bunyan.createLogger({
  name: 'Landkid',
  // standard serializers for things like Error, req and res
  serializers: bunyan.stdSerializers,
  // adds the source of the log (file and line number) (note: Do not use in production)
  // src: true,
  streams: [{ path: LOG_PATH }, { stream: process.stdout }],
});

export default Logger;
