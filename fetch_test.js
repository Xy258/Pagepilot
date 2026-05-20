fetch('https://via.placeholder.com/300.png')
  .then((res) => {
    console.log('STATUS', res.status);
    return res.arrayBuffer();
  })
  .then((buf) => {
    console.log('LENGTH', buf.byteLength);
  })
  .catch((err) => {
    console.error('ERR', err.message);
  });
