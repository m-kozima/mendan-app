const https = require('https');

exports.handler = async function(event) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxlhZpXIi1Yl2Yj6BRUq4i99P_4TRYKJiF9hBxVRB2fEjb3I44pG9Mf4sXE9YxkazA/exec';
  
  const params = event.queryStringParameters || {};
  const queryString = Object.keys(params).map(k => k + '=' + params[k]).join('&');
  const url = GAS_URL + (queryString ? '?' + queryString : '');

  if (event.httpMethod === 'POST') {
    return new Promise((resolve) => {
      const req = https.request(url, { method: 'POST' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: data
        }));
      });
      req.write(event.body || '');
      req.end();
    });
  }

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: data
      }));
    });
  });
};