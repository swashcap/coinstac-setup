'use strict';

const axios = require('axios');
const funnyVersions = require('funny-versions');
const pkg = require('./package.json');
const program = require('commander');

const DEFAULT_CONSORTIUM_COUNT = 1;
const DEFAULT_USER_COUNT = 3;

/**
 * Get a number parser with a default.
 *
 * @param {string} value
 * @returns {Function}
 */
function getNumberParser(defaultValue) {
  return function numberParser(value) {
    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) || parsed < 0 ? defaultValue : parsed;
  };
}

/**
 * Get an ID from a name.
 *
 * @param {string} name
 * @returns {string}
 */
function getId(name) {
  return name.replace(/\W/g, '').toLowerCase();
}

program
  .version(pkg.version)
  .option('-c, --computation [value]', 'Computation', 'bisect')
  .option('--consortium [value]', 'Consortium name')
  .option(
    '--consortiumcount [value]', 'Consortium count',
    getNumberParser(DEFAULT_CONSORTIUM_COUNT),
    DEFAULT_CONSORTIUM_COUNT
  )
  .option('-d, --database [value]', 'Database URL', 'http://localhost:5984')
  .option('-u, --username [value]', 'Username', 'demo1')
  .option(
    '--usercount [value]',
    'User count',
    getNumberParser(DEFAULT_USER_COUNT),
    DEFAULT_USER_COUNT
  )
  .parse(process.argv);

Promise.all([
  axios.get(`${program.database}/consortia/_all_docs`),
  axios.get(`${program.database}/computations/_all_docs`),
])
  .then(([consortiaResponse, computationsResponse]) => {
    if (consortiaResponse.data.rows.length) {
      throw new Error('Consortia database already populated');
    }

    return Promise.all(computationsResponse.data.rows.map(row => {
      return axios.get(`${program.database}/computations/${row.id}`);
    }));
  })
  .then(responses => {
    const compResponse = responses.find(r => {
      return r.data.name.indexOf(program.computation) > -1;
    });

    if (!compResponse) {
      throw new Error(`Couldn't find computation ${program.computation}`);
    }

    const names = [program.consortium || funnyVersions.generate()];
    const users = [program.username];

    for (let i = 1, il = program.usercount; i < il; i++) {
      users.push(`demo${i + 1}`);
    }
    for (let i = 1, il = program.consortiumcount; i < il; i++) {
      names.push(funnyVersions.generate());
    }

    return Promise.all(names.map(name => {
      const id = getId(name);

      return axios.put(`${program.database}/consortia/${id}`, {
        activeComputationId: compResponse.data._id,
        activeComputationInputs: [],
        description: 'This is a sample consortium!',
        label: name,
        tags: [],
        users,
        owners: [program.username]
      });
    }));
  })
  .then(() => console.log('Consortia set up'))
  .catch(error => console.error(error));
