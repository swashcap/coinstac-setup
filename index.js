'use strict';

const axios = require('axios');
const funnyVersions = require('funny-versions');
const pkg = require('./package.json');
const program = require('commander');

program
  .version(pkg.version)
  .option('-c, --computation [value]', 'Computation', 'bisect')
  .option('-d, --database [value]', 'Database URL', 'http://localhost:5984')
  .option('-u, --username [value]', 'Username', 'demo1')
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
      throw new Error('Couldn\'t find ridge regression');
    }

    const name = funnyVersions.generate();
    const id = name.replace(/\W/g, '').toLowerCase();

    return axios.put(`${program.database}/consortia/${id}`, {
      activeComputationId: compResponse.data._id,
      description: 'This is a sample consortium!',
      label: name,
      tags: [],
      users: [program.username, 'demo2', 'demo3'],
      owners: [program.username]
    });
  })
  .then(() => console.log('Consortia set up'))
  .catch(error => console.error(error));
