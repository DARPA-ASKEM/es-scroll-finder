const { Client } = require('@elastic/elasticsearch');
const config = require('./config.json');

const sourceURL = process.argv[2];
const sourceIndex = process.argv[3];
const targetIndex = process.argv[4];

const sourceAuth = config[sourceURL] || {};

const sourceClient = new Client({
  node: `${sourceURL}`,
  auth: {
    username: sourceAuth.username,
    password: sourceAuth.password
  }
});
const targetClient = new Client({
  node: `${sourceURL}`,
  auth: {
    username: sourceAuth.username,
    password: sourceAuth.password
  }
});


const SIZE = 30;
const transformFn = (doc) => {
  if (!doc.header || !doc.id) {
    console.log('bad data', doc.id);
    return;
  }

  if (!doc.header.schema_name) {
    console.log('adjusting', doc.id);

    if (doc.header.schema.includes('petrinet')) {
      doc.header.schema_name = 'petrinet';
    } else if (doc.header.schema.includes('regnet')) {
      doc.header.schema_name = 'regnet';
    } else if (doc.header.schema.includes('stockflow')) {
      doc.header.schema_name = 'stockflow';
    }
  }
};

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
  const transformed = [];
  responseQueue.push(response);
  
  // Transform
  while (responseQueue.length) {
    const body = responseQueue.shift();

    const docs = body.hits.hits.map(d => d._source);

    if (docs.length === 0) break;

    for (const doc of docs) {
      // transformFn(doc);
      transformed.push(doc);
    };

    // Get the next response if there are more quotes to fetch
    responseQueue.push(
      await sourceClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '2m'
      })
    );
  }
  
  // Reindexing
  const bulkSize = 30;
  let bulk = [];
  console.log(transformed.length);
  for (let i = 0; i < transformed.length; i++) {
    bulk.push({ index: { _index: targetIndex, _id: transformed[i].id } });
    bulk.push(transformed[i]);

    if (i > 0 && i % bulkSize === 0) {
      await targetClient.bulk({
        body: bulk
      });
      bulk = [];
      console.log('bulking ' + i);
    }
  }
  if (bulk.length > 0) {
    await targetClient.bulk({
      body: bulk
    });
    console.log('bulking ' + bulk.length);
  }
}

run();
