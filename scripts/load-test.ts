'use strict';

import autocannon, { Request } from 'autocannon';
import crypto from 'crypto';

const overallRate = 5
const duration = 600

const instance = autocannon(
  {
    url: 'http://localhost:4343',
    overallRate,
    duration,
    requests: [
      {
        path: '/api/archiver/stamp',
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        setupRequest: (request: Request) => {
          request.body = JSON.stringify({
            hash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest().toString('hex'),
            fileId: crypto.randomUUID(),
            webhooks: []
          })
    
          return request
        }
      } as any
    ]
  },
  console.log
);

process.once('SIGINT', () => {
  (instance as any).stop();
});

autocannon.track(instance, { renderProgressBar: true });
