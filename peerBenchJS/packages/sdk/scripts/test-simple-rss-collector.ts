import { SimpleGeneralRSSCollector } from "../src/collectors/simple-general-rss-collector";

async function main() {
  const collector = new SimpleGeneralRSSCollector();
  
  // Test with a few different RSS feeds including RDF format
  const testFeeds = [
    "https://arxiv.org/rss/cs.AI", // arXiv AI feed (RSS format)
    "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=5&utm_campaign=pubmed-2&fc=20250829034853", // PubMed feed (RSS format)
    "https://connect.medrxiv.org/medrxiv_xml.php?subject=all", // medRxiv feed (RDF format)
    "https://connect.biorxiv.org/biorxiv_xml.php?subject=all" // BioRxiv feed (RSS format)
  ];

  for (const feedUrl of testFeeds) {
    try {
      console.log(`\n=== Testing RSS Feed: ${feedUrl} ===`);
      const data = await collector.collect(feedUrl);
      
      console.log(`Collected ${data.length} items`);
      
      // Show first item as example
      if (data.length > 0) {
        const firstItem = data[0];
        console.log("\nFirst item example:");
        console.log(`Title: ${firstItem.title}`);
        console.log(`Link: ${firstItem.link || 'N/A'}`);
        console.log(`Main text length: ${firstItem.mainText.length} characters`);
        console.log(`Tags: ${firstItem.tags.join(', ')}`);
        console.log(`Metadata keys: ${Object.keys(firstItem.metadata).join(', ')}`);
        
        // Show first 200 characters of cleaned text
        const preview = firstItem.mainText.substring(0, 200);
        console.log(`Text preview: ${preview}...`);
      }
      
    } catch (error) {
      console.error(`Error collecting from ${feedUrl}:`, error);
    }
  }
}

main().catch(console.error);
