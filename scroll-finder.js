const { Client } = require('@elastic/elasticsearch');
const config = require('./config.json');

const sourceURL = process.argv[2];
const sourceIndex = process.argv[3];
const sourceAuth = config[sourceURL] || {};

const finder = process.argv[process.argv.length - 1];
const finderFn = require(`./${finder}`);

const sourceClient = new Client({
  node: `${sourceURL}`,
  auth: {
    username: sourceAuth.username,
    password: sourceAuth.password
  }
});

const SIZE = 100;

const run = async () => {
  const response = await sourceClient.search({
    index: sourceIndex,
    scroll: '2m',
    size: SIZE,
    body: {
      query: {
        match_all: {}
      }
    }
  });

  const responseQueue = [];
  const foundResult = [];
  responseQueue.push(response);
  
  // Transform
  while (responseQueue.length) {
    const body = responseQueue.shift();

    const docs = body.hits.hits.map(d => d._source);

    if (docs.length === 0) break;

    for (const doc of docs) {
      const found = await finderFn(doc);
      if (found) {
        foundResult.push(doc.id || doc);
      }
    };

    console.log('.....debug', body._scroll_id);

    // Get the next response if there are more quotes to fetch
    responseQueue.push(
      await sourceClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '2m'
      })
    );
  }
  console.log(foundResult);
}

run();
