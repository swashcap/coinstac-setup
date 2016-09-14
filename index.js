'use strict';

const axios = require('axios');
const funnyVersions = require('funny-versions');
const pkg = require('./package.json');
const program = require('commander');

const DEFAULT_COMPUTATION = 'ridge';
const DEFAULT_CONSORTIUM_COUNT = 1;
const DEFAULT_DATABASE = 'http://localhost:5984';
const DEFAULT_USERNAME = 'demo1';
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

/**
 * COINSTAC setup.
 * @module
 *
 * @param {Object} options
 * @param {string} [options.computation=DEFAULT_COMPUTATION]
 * @param {string} [options.consortium]
 * @param {number} [options.consortiumcount=DEFAULT_CONSORTIUM_COUNT]
 * @param {string} [options.database=DEFAULT_DATABASE]
 * @param {number} [options.usercount=DEFAULT_USER_COUNT]
 * @param {string} [options.username=DEFAULT_USERNAME]
 * @returns {Promise}
 */
function coinstacSetup(options) {
  const computation = options.computation || DEFAULT_COMPUTATION;
  const consortium = options.consortium;
  const consortiumcount = options.consortiumcount || DEFAULT_CONSORTIUM_COUNT;
  const database = options.database || DEFAULT_DATABASE;
  const usercount = options.usercount || DEFAULT_USER_COUNT;
  const username = options.username || DEFAULT_USERNAME;

  return Promise.all([
    axios.get(`${database}/consortia/_all_docs`),
    axios.get(`${database}/computations/_all_docs`),
  ])
    .then(([consortiaResponse, computationsResponse]) => {
      if (consortiaResponse.data.rows.length) {
        throw new Error('Consortia database already populated');
      }

      return Promise.all(computationsResponse.data.rows.map(row => {
        return axios.get(`${database}/computations/${row.id}`);
      }));
    })
    .then(responses => {
      const compResponse = responses.find(r => {
        return r.data.name.indexOf(computation) > -1;
      });

      if (!compResponse) {
        throw new Error(`Couldn't find computation ${program.computation}`);
      }

      const names = [consortium || funnyVersions.generate()];
      const users = [username];

      for (let i = 1, il = usercount; i < il; i++) {
        users.push(`demo${i + 1}`);
      }
      for (let i = 1, il = consortiumcount; i < il; i++) {
        names.push(funnyVersions.generate());
      }

      return Promise.all(names.map(name => {
        const id = getId(name);

        return axios.put(`${database}/consortia/${id}`, {
          activeComputationId: compResponse.data._id,
          activeComputationInputs: [[[
            'Right-Hippocampus',
            'TotalGrayVol',
          ]]],
          description: 'This is a sample consortium!',
          label: name,
          tags: [],
          users,
          owners: [username],
        });
      }));
    })
    .then(() => console.log('Consortia set up'))
    .catch(error => console.error(error));
}

/**
 * Called directly.
 * {@link http://stackoverflow.com/a/6398335}
 */
if (require.main === module) {
  program
    .version(pkg.version)
    .option('-c, --computation [value]', 'Computation', DEFAULT_COMPUTATION)
    .option('--consortium [value]', 'Consortium name')
    .option(
      '--consortiumcount [value]', 'Consortium count',
      getNumberParser(DEFAULT_CONSORTIUM_COUNT),
      DEFAULT_CONSORTIUM_COUNT
    )
    .option('-d, --database [value]', 'Database URL', DEFAULT_DATABASE)
    .option('-u, --username [value]', 'Username', DEFAULT_USERNAME)
    .option(
      '--usercount [value]',
      'User count',
      getNumberParser(DEFAULT_USER_COUNT),
      DEFAULT_USER_COUNT
    )
    .parse(process.argv);

  coinstacSetup(program);
}

module.exports = coinstacSetup;

