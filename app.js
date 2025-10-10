const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello, Mini Task API Team!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${3000}`);
});