   const { handler } = require('../netlify/functions/fetch-news.js');

   const q = {};
   if (process.env.ONLY) q.only = process.env.ONLY;
   if (process.env.OFFSET) q.offset = process.env.OFFSET;
   if (process.env.BATCH) q.batch = process.env.BATCH;

   // Safety net: never let a stuck request keep the job running for ten minutes.
   setTimeout(() => {
     console.error('Stopped after 4 minutes: a request was taking too long.');
     process.exit(1);
   }, 4 * 60 * 1000).unref();

   console.log('Starting fetch…', JSON.stringify(q));

   handler({ queryStringParameters: q })
     .then((res) => {
       console.log(res.body);
       process.exit(0);
     })
     .catch((err) => {
       console.error(err);
       process.exit(1);
     });
