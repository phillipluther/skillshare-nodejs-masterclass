const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const logger = {
  baseDir: path.join(__dirname, '../.logs'),
  append: (fileName, contents, callback) => {
    const filePath = path.join(logger.baseDir, `${fileName}.log`);

    fs.open(filePath, 'a', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        fs.appendFile(fileDescriptor, contents + '\n', (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback('Failed to close log file');
              }
            });
          } else {
            callback('Failed to append log message to file');
          }
        });
      } else {
        callback('Could not open log file');
      }
    });
  },
  list: (includeCompressed = false, callback) => {
    fs.readdir(logger.baseDir, (err, data) => {
      if (!err && data) {
        const trimmedFileNames = data.reduce((fileNames, fileName) => {
          const isLogFile = /\.log$/.test(fileName);
          const isCompressedLog = /\.gz\.b64$/.test(fileName);

          if (isLogFile || (isCompressedLog && includeCompressed)) {
            fileNames.push(fileName.replace(/\.(log|gz\.b64)$/, ''));
          }

          return fileNames;
        }, []);

        callback(false, trimmedFileNames);
      } else {
        callback(err, data);
      }
    });
  },
  compress: (logId, destLogId, callback) => {
    const fileName = `${logId}.log`;
    const destFileName = `${destLogId}.gz.b64`;

    fs.readFile(path.join(logger.baseDir, fileName), (err, inputString) => {
      if (!err && inputString) {
        zlib.gzip(inputString, (err, buffer) => {
          if (!err && buffer) {
            fs.open(path.join(logger.baseDir, destFileName), 'wx', (err, fileDescriptor) => {
              if (!err && fileDescriptor) {
                fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                  if (!err) {
                    fs.close(fileDescriptor, (err) => {
                      if (!err) {
                        callback(false);
                      } else {
                        callback(err);
                      }
                    });
                  } else {
                    callback(err);
                  }
                });
              } else {
                callback(err);
              }
            });
          } else {
            callback(err);
          }
        });
      } else {
        callback(err);
      }
    });
  },
  decompress: (fileId, callback) => {
    const fileName = `${fileId}.gz.b64`;

    fs.readFile(path.join(logger.baseDir, fileName), (err, str) => {
      if (!err && str) {
        const inputBuffer = Buffer.from(str, 'base64');

        zlib.unzip(inputBuffer, (err, outputBuffer) => {
          if (!err && outputBuffer) {
            callback(false, outputBuffer.toString());
          } else {
            callback(err);
          }
        });
      } else {
        callback(err);
      }
    });
  },
  truncate: (logId, callback) => {
    fs.truncate(path.join(logger.baseDir, `${logId}.log`), 0, (err) => {
      if (!err) {
        callback(false);
      } else {
        callback(err);
      }
    });
  },
};

module.exports = logger;
