'use strict';

const axios = require('axios');
const dbmap = require('/coins/config/dbmap.json');
const funnyVersions = require('funny-versions');
const pkg = require('./package.json');
const program = require('commander');

const client = dbmap.coinstac ?
  axios.create({
    auth: {
      password: dbmap.coinstac.password,
      username: dbmap.coinstac.user,
    },
  }) :
  axios;

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
 * Parse computation inputs.
 *
 * @param {string} value
 * @returns {(Array|undefined)} Parsed JSON
 */
function computationInputsParser(value) {
  return [[
    ['TotalGrayVol'],
    ['20'],
    ['1'],
    [{
      name: 'Is Control',
      type: 'boolean',
    }, {
      name: 'Age',
      type: 'number',
    }],
  ]];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [[[parsed]]];
    } else if (!Array.isArray(parsed[0])) {
      return [[parsed]];
    } else if (!Array.isArray(parsed[0][0])) {
      return [parsed];
    }

    return parsed;
  } catch (error) {
  }
}

/**
 * COINSTAC setup.
 * @module
 *
 * @param {Object} options
 * @param {string} [options.computation=DEFAULT_COMPUTATION]
 * @param {Array} [options.computationinput] Computation inputs
 * @param {string} [options.computationversion] Semver version string to select
 * computation
 * @param {string} [options.consortium]
 * @param {number} [options.consortiumcount=DEFAULT_CONSORTIUM_COUNT]
 * @param {string} [options.database=DEFAULT_DATABASE]
 * @param {number} [options.usercount=DEFAULT_USER_COUNT]
 * @param {string} [options.username=DEFAULT_USERNAME]
 * @returns {Promise}
 */
function coinstacSetup(options) {
  const computation = options.computation || DEFAULT_COMPUTATION;
  const computationversion = options.computationversion;
  const computationinputs = options.computationinputs;
  const consortium = options.consortium;
  const consortiumcount = options.consortiumcount || DEFAULT_CONSORTIUM_COUNT;
  const database = options.database || DEFAULT_DATABASE;
  const usercount = options.usercount || DEFAULT_USER_COUNT;
  const username = options.username || DEFAULT_USERNAME;

  return Promise.all([
    client.get(`${database}/consortia/_all_docs`),
    client.get(`${database}/computations/_all_docs`),
  ])
    .then(([consortiaResponse, computationsResponse]) => {
      if (consortiaResponse.data.rows.length) {
        throw new Error('Consortia database already populated');
      }

      return Promise.all(computationsResponse.data.rows.map(row => {
        return client.get(`${database}/computations/${row.id}`);
      }));
    })
    .then(responses => {
      const compResponse = responses.find(r => {
        const hasName = r.data.name.indexOf(computation) > -1;

        return computationversion ?
          hasName && r.data.version.indexOf(computationversion) > -1 :
          hasName;
      });

      debugger;
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
        const doc = {
          activeComputationId: compResponse.data._id,
          activeComputationInputs: computationinputs,
          description: 'This is a sample consortium!',
          label: name,
          tags: [],
          users,
          owners: [username],
        };

        if (computationinputs) {
          doc.activeComputationInputs = computationinputs;
        }

        return client.put(`${database}/consortia/${id}`, doc);
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
    .option('--computationversion [value]', 'Computation version')
    .option('--consortium [value]', 'Consortium name')
    .option(
      '--consortiumcount [value]',
      'Consortium count',
      getNumberParser(DEFAULT_CONSORTIUM_COUNT),
      DEFAULT_CONSORTIUM_COUNT
    )
    .option('-d, --database [value]', 'Database URL', DEFAULT_DATABASE)
    .option(
      '-i, --computationinputs [value]',
      'Computation inputs',
      computationInputsParser
    )
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

