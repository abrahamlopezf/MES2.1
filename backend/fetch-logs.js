const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.github.com',
  path: '/repos/abrahamlopezf/MES2.1/actions/runs?per_page=1',
  method: 'GET',
  headers: {
    'User-Agent': 'Node.js'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.workflow_runs && parsed.workflow_runs.length > 0) {
        const runId = parsed.workflow_runs[0].id;
        console.log('Latest run ID:', runId);
        
        // Fetch jobs for this run
        const jobOpts = {
          hostname: 'api.github.com',
          path: `/repos/abrahamlopezf/MES2.1/actions/runs/${runId}/jobs`,
          method: 'GET',
          headers: { 'User-Agent': 'Node.js' }
        };
        
        https.request(jobOpts, (res2) => {
          let data2 = '';
          res2.on('data', (c) => { data2 += c; });
          res2.on('end', () => {
            fs.writeFileSync('gh_logs.json', data2);
            console.log('Saved jobs to gh_logs.json');
          });
        }).end();

      }
    } catch(e) {
      console.error(e);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
