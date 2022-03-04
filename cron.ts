require('dotenv').config();

import cron from 'node-cron';
import axios from 'axios';

console.log(new Date(), 'cron started...');

cron.schedule('* * * * *', async () => {
  console.log(new Date(), 'triggering commit...');

  try {
    await axios.post(`http://localhost:${process.env.PORT}/api/archiver/commit`);
  } catch (error) {
    console.warn(new Date(), 'trigger failed.');
    console.warn(new Date(), error);
  }
});
