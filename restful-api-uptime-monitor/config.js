const environments = {
  staging: {
    env: 'staging',
    port: 3000,
  },
  production: {
    env: 'production',
    port: '8000',
  },
};

const currentEnv = (typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV.toLowerCase()
  : 'staging';

const activeEnv = (typeof environments[currentEnv] === 'object')
  ? environments[currentEnv]
  : 'staging';

module.exports = activeEnv;
