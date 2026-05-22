const https = require('https');

function followRedirects(url, method, body, callback) {
  const urlObj = new URL(url);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const req = https.request(options, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
      followRedirects(res.headers.location, method, body, callback);
      return;
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data));
  });
  req.on('error', (e) => callback(e));
  if (body) req.write(body);
  req.end();
}

exports.handler = async function(event) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxlhZpXIi1Yl2Yj6BRUq4i99P_4TRYKJiF9hBxVRB2fEjb3I44pG9Mf4sXE9YxkazA/exec';
  const params = event.queryStringParameters || {};
  const queryString = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const url = GAS_URL + (queryString ? '?' + queryString : '');

  return new Promise((resolve) => {
    followRedirects(url, event.httpMethod, event.body, (err, data) => {
      if (err) {
        resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
        return;
      }
      resolve({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: data
      });
    });
  });
};