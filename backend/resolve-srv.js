const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.artisan-workshop.azydkb8.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('Error resolving SRV:', err);
    return;
  }
  console.log('SRV Addresses:', addresses);
  
  const hostnames = addresses.map(a => a.name);
  dns.resolveTxt('artisan-workshop.azydkb8.mongodb.net', (err, txtRecords) => {
    if (err) {
      console.error('Error resolving TXT:', err);
      return;
    }
    console.log('TXT Records:', txtRecords);
  });
});
