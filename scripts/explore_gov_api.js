const https = require('https');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', err => reject(err));
  });
}

async function explore() {
  console.log('🔍 Searching data.gov.il for "דגמי רכב" (Car Models)...');
  
  // Search for the package
  const searchUrl = 'https://data.gov.il/api/3/action/package_search?q=' + encodeURIComponent('דגמי רכב');
  const searchResult = await fetchJson(searchUrl);
  
  if (!searchResult.success || searchResult.result.results.length === 0) {
    console.log('Could not find the dataset packages.');
    return;
  }

  // Find the exact resource for car models and vehicle registry
  let carModelsResourceId = '142afde2-6228-49f9-8a29-9b6c3a0cbe40'; // Fallback to a known common one if search fails to parse easily
  let vehicleRegistryResourceId = '053cea08-09bc-40ec-8f7a-156f0677aff3'; // Fallback
  
  // Let's iterate over results to find the most relevant ones
  for (const pkg of searchResult.result.results) {
    if (pkg.title.includes('דגמים של כלי רכב')) {
      const resource = pkg.resources.find(r => r.format === 'CSV' || r.format === 'XML' || true);
      if (resource) carModelsResourceId = resource.id;
    }
  }

  console.log('\n=============================================');
  console.log(`🚗 Car Models Resource ID: ${carModelsResourceId}`);
  console.log('Fetching a sample of 2 car models...');
  
  const modelsUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${carModelsResourceId}&limit=2`;
  const modelsData = await fetchJson(modelsUrl);
  
  if (modelsData.success) {
    const fields = modelsData.result.fields.map(f => f.id).join(', ');
    console.log(`\nAvailable Fields for Car Models:\n${fields}`);
    console.log(`\nSample Data:\n`, JSON.stringify(modelsData.result.records, null, 2));
  } else {
    console.log('Failed to fetch Car Models data.');
  }

  console.log('\n=============================================');
  console.log(`🚙 Vehicle Registry Resource ID: ${vehicleRegistryResourceId}`);
  console.log('Fetching a sample of 2 active vehicles...');
  
  const registryUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${vehicleRegistryResourceId}&limit=2`;
  const registryData = await fetchJson(registryUrl);
  
  if (registryData.success) {
    const fields = registryData.result.fields.map(f => f.id).join(', ');
    console.log(`\nAvailable Fields for Vehicle Registry:\n${fields}`);
    console.log(`\nSample Data:\n`, JSON.stringify(registryData.result.records, null, 2));
  } else {
    console.log('Failed to fetch Vehicle Registry data. (It might be down or ID changed)');
  }
}

explore().catch(console.error);
