# COINSTAC Setup

_Helper script for setting up [COINSTAC](https://github.com/MRN-Code/coinstac) for local development._

## What this does:

This creates a consortium document with an `activeComputationId` pulled from your computations database. It seeds the document with three users, one of which you can specify.

## Setup

```shell
git clone git@github.com:swashcap/coinstac-setup.git
cd coinstac-setup
npm install
```

## Running

Ensure that:

* CouchDB is up and running
* The computations is seeded
* The consortia database _has no documents_

Then, run:

```shell
npm start
```

Alternatively, you can pass some flags:

```shell
node index.js \
  --computation laplacian \
  --database https://coinstac-dev.mrn.org \
  -- username bob
```
