const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('./logger');
const dataCrud = require('./data-crud');
const helpers = require('./helpers');

const workers = {
  alertUser: (checkData) => {
    const {
      protocol,
      url,
      method,
      state,
      phone,
    } = checkData;
    const message = `Alert! ${method.toUpperCase()} to ${protocol}://${url} is ${state}.`;

    helpers.sendTwilioSMS(phone, message, (err) => {
      if (!err) {
        console.log('User successfully alerted by SMS:', message);
      } else {
        console.error(`Failed to notify ${phone} of status change`, err);

      }
    })
  },
  processCheckOutcome: (checkData, checkOutcome) => {
    const hasResponse = checkOutcome?.responseCode ? true : false;
    const isOkResponse = hasResponse && checkData.successCodes.includes(checkOutcome.responseCode);
    const state = !checkOutcome.error && isOkResponse ? 'up' : 'down';

    // only text users when state changes, but not the very first time
    const needsAlert = checkData.lastChecked && (state !== checkData.state);
    const newCheckData = {
      ...checkData,
      state,
      lastChecked: Date.now(),
    };

    workers.log(newCheckData, checkOutcome, needsAlert);

    dataCrud.update('checks', newCheckData.id, newCheckData, (err) => {
      if (!err) {
        if (needsAlert) {
          workers.alertUser(newCheckData);
        } else {
          console.log(`Check to ${newCheckData.url} is all clear; no alert needed`);
        }
      } else {
        console.error(`Failed to update check ${newCheckData.id}`);
      }
    });
  },
  performCheck: (checkData) => {
    const checkOutcome = {
      error: false,
      responseCode: false,
    };
    const parsedUrl = new URL(`${checkData.protocol}://${checkData.url}`);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.path;
    const requestDetails = {
      protocol: `${checkData.protocol}:`,
      hostname,
      method: checkData.method.toUpperCase(),
      path,
      timeout: checkData.timeoutSeconds * 1000,
    };
    const requestModule = checkData.protocol === 'http' ? http : https;

    let outcomeSent = false;

    const req = requestModule.request(requestDetails, (res) => {
      const { statusCode } = res;
      checkOutcome.responseCode = statusCode;

      if (!outcomeSent) {
        workers.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('error', (err) => {
      checkOutcome.error = {
        error: true,
        value: err,
      };

      if (!outcomeSent) {
        workers.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('timeout', (err) => {
      checkOutcome.error = {
        error: true,
        value: 'timeout',
      };

      if (!outcomeSent) {
        workers.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.end();
  },
  validateCheckData: (originalCheckData = {}) => {
    const requiredFields = [
      'id',
      'phone',
      'protocol',
      'url',
      'method',
      'successCodes',
      'timeoutSeconds',
    ];
    const checkData = {
      ...originalCheckData,
      state: originalCheckData.state || 'down',
    };
    const fieldErrors = helpers.getFieldErrors(checkData, requiredFields);

    // worker-specific data; these won't be set until the worker runs the first time
    if (fieldErrors.length === 0) {
      workers.performCheck(checkData);
    } else {
      console.error(fieldErrors[0]);
    }
  },
  gatherAllChecks: () => {
    dataCrud.list('checks', (err, checks) => {
      if (!err && checks && (checks.length > 0)) {
        checks.forEach((check) => {
          dataCrud.read('checks', check, (err, originalCheckData) => {
            if (!err && originalCheckData) {
              workers.validateCheckData(originalCheckData);
            } else {
              console.error('Error reading check');d
            }
          });
        });
      } else {
        console.error('No checks to process');
      }
    });
  },
  log: (checkData, checkOutcome, alerted) => {
    const logData = {
      checkData,
      checkOutcome,
      alerted,
    };

    const stringifiedData = JSON.stringify(logData);
    const logFileName = checkData.id;

    logger.append(logFileName, stringifiedData, (err) => {
      if (!err) {
        console.log(`Log output found at ./data/logs/${logFileName}.txt`);
      } else {
        console.error('Logging failed:', err);
      }
    });
  },
  rotateLogs: () => {
    logger.list(false, (err, logs) => {
      if (!err && logs) {
        logs.forEach((logName) => {
          const logId = logName.replace(/\.log$/, '');
          const compressedLogId = `${logId}-${Date.now()}`;

          logger.compress(logId, compressedLogId, (err) => {
            if (!err) {
              logger.truncate(logId, (err) => {
                if (!err) {
                  console.log('Successfully truncated log file; empty and ready!');
                } else {
                  console.log('Could not truncate log file');
                }
              });
            } else {
              console.error('Could not compress log', err);
            }
          });
        });
      } else {
        console.error('Could not find any logs to rotate');
      }
    });
  },
  loop: () => {
    setInterval(() => {
      workers.gatherAllChecks();
    }, 1000 * 5);
  },
  logRotationLoop: () => {
    setInterval(() => {
      workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
  },
  init: () => {
    workers.gatherAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotationLoop();
  },
};

module.exports = workers;
