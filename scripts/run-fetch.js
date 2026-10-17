const { handler } = require('../netlify/functions/fetch-news.js');

const q = {};
if (process.env.ONLY) q.only = process.env.ONLY;
if (process.env.OFFSET) q.offset = process.env.OFFSET;
if (process.env.BATCH) q.batch = process.env.BATCH;

handler({ queryStringParameters: q })
  .then((res) => console.log(res.body))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
