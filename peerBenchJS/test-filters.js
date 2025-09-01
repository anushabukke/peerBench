// Simple test script to verify the new filters are working
const testFilters = async () => {
  const baseUrl = 'http://localhost:3000/api/v1/prompts';
  
  console.log('Testing new filters...\n');
  
  // Test 1: Basic request without filters
  try {
    const response1 = await fetch(`${baseUrl}?page=1&pageSize=5`);
    const data1 = await response1.json();
    console.log('✅ Basic request successful:', data1.pagination.totalCount, 'prompts found');
  } catch (error) {
    console.log('❌ Basic request failed:', error.message);
  }
  
  // Test 2: Test uploaderId filter
  try {
    const response2 = await fetch(`${baseUrl}?page=1&pageSize=5&uploaderId=test-user-id`);
    const data2 = await response2.json();
    console.log('✅ UploaderId filter request successful:', data2.pagination.totalCount, 'prompts found');
  } catch (error) {
    console.log('❌ UploaderId filter request failed:', error.message);
  }
  
  // Test 3: Test fileId filter
  try {
    const response3 = await fetch(`${baseUrl}?page=1&pageSize=5&fileId=123`);
    const data3 = await response3.json();
    console.log('✅ FileId filter request successful:', data3.pagination.totalCount, 'prompts found');
  } catch (error) {
    console.log('❌ FileId filter request failed:', error.message);
  }
  
  // Test 4: Test combined filters
  try {
    const response4 = await fetch(`${baseUrl}?page=1&pageSize=5&uploaderId=test-user&fileId=456&tags=test`);
    const data4 = await response4.json();
    console.log('✅ Combined filters request successful:', data4.pagination.totalCount, 'prompts found');
  } catch (error) {
    console.log('❌ Combined filters request failed:', error.message);
  }
  
  console.log('\n🎉 Filter tests completed!');
};

// Run the test
testFilters().catch(console.error);
