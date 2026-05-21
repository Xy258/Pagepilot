const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.artisan-workshop.azydkb8.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('Error resolving SRV:', err);
    
    // Try resolving with a specific DNS server (Google DNS)
    dns.setServers(['8.8.8.8']);
    dns.resolveSrv('_mongodb._tcp.artisan-workshop.azydkb8.mongodb.net', (err2, addresses2) => {
      if (err2) {
        console.error('Error resolving SRV with 8.8.8.8:', err2);
      } else {
        console.log('SRV Addresses (Google DNS):', addresses2);
        resolveTxt(addresses2);
      }
    });
    return;
  }
  console.log('SRV Addresses:', addresses);
  resolveTxt(addresses);
});

function resolveTxt(addresses) {
  dns.resolveTxt('artisan-workshop.azydkb8.mongodb.net', (err, txtRecords) => {
    if (err) {
      console.error('Error resolving TXT:', err);
      return;
    }
    console.log('TXT Records:', txtRecords);
    
    const hostnames = addresses.map(a => `${a.name}:${a.port}`).join(',');
    const txtParams = txtRecords.flat().join('&');
    const directUri = `mongodb://ullasmahesh21_db_user:6Amns8FjGvoT3Fld@${hostnames}/artisan-workshop?ssl=true&${txtParams}`;
    console.log('\n--- DIRECT URI ---');
    console.log(directUri);
  });
}
