const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

/*
 * example data structure
 *
 * .data/
 *   users/
 *     somefile.json
 *     anotherfile.json
 *   checks/
 *     somefile.json
 *   etc.
 */
const dataLib = {
  baseDir: path.join(__dirname, '../.data'),

  create: (dir, file, data, callback) => {
    fs.open(path.join(dataLib.baseDir, dir, `${file}.json`), 'wx', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback(`Failed closing ${dir}/${file}`);
              }
            });
          } else {
            callback(`Failed writing to ${dir}/${file}`);
          }
        });
      } else {
        callback(`Failed to create ${dir}/${file}.json. Does the file already exist?`);
      }
    });
  },

  read: (dir, file, callback) => {
    fs.readFile(path.join(dataLib.baseDir, dir, `${file}.json`), 'utf8', (err, data) => {
      if (!err && data) {
        callback(false, helpers.jsonToObject(data));
      } else {
        callback(err, data);
      }
    });
  },

  update: (dir, file, data, callback) => {
    const relativePath = path.join(dir, `${file}.json`);

    fs.open(path.join(dataLib.baseDir, relativePath), 'r+', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, JSON.stringify(data), (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback(`Failed to close ${relativePath} after update`);
                  }
                });
              } else {
                callback(`Failed to update ${relativePath}`);
              }
            })
          } else {
            callback(`Failed to truncate ${relativePath} during update`);
          }
        })
      } else {
        callback(`Failed to open ${relativePath} for updating. Does it exist?`);
      }
    })
  },

  delete: (dir, file, callback) => {
    const relativePath = path.join(dir, `${file}.json`);

    fs.unlink(path.join(dataLib.baseDir, relativePath), (err) => {
      if (!err) {
        callback(false);
      } else {
        callback(`Failed to delete ${relativePath}`);
      }
    })
  },
};

module.exports = dataLib;
