import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('usuarios', () => JSON.parse(open('./addresses.json')));

export const options = {
  stages: [
    { duration: '5s', target: 10, vus: 3 },
    { duration: '10', target: 50, vus: 50 },
    { duration: '10s', target: 0 },
    { duration: '2m', target: 50, vus: 50 },
  ]
};

export default function () {
  const randomUser = users[Math.floor(Math.random() * users.length)];


  const payload = JSON.stringify({
    userAddress: randomUser,
  });

  const headers = {
    'Content-Type': 'application/json',
  };

  const res = http.post('http://localhost:3001/voucher/create-voucher', payload, { headers, timeout: '120s' });

  check(res, {
    'status is 200': (r) => r.status === 201,
    'status is 409': (r) => r.status === 409
  });

  sleep(1); 
}
