const tokensHandler = require('./tokens');
const usersHandler = require('./users');
const checksHandler = require('./checks');

module.exports = {
  notFound: (data, callback) => {
    callback(404);
  },
  ping: (data, callback) => {
    callback(200);
  },
  tokens: (data, callback) => {
    const acceptedMethods = ['POST', 'PUT', 'GET', 'DELETE'];

    if (acceptedMethods.includes(data.method)) {
      tokensHandler[data.method](data, callback);
    } else {
      callback(405);
    }
  },
  users: (data, callback) => {
    const acceptedMethods = ['POST', 'PUT', 'GET', 'DELETE'];

    if (acceptedMethods.includes(data.method)) {
      usersHandler[data.method](data, callback);
    } else {
      callback(405);
    }
  },
  checks: (data, callback) => {
    const acceptedMethods = ['POST', 'PUT', 'GET', 'DELETE'];

    if (acceptedMethods.includes(data.method)) {
      checksHandler[data.method](data, callback);
    } else {
      callback(405);
    }
  }
};
