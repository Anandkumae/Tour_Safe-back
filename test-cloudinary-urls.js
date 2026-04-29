const https = require('https');

async function testCloudinaryUrls() {
    console.log('🔍 Testing Cloudinary Audio URLs...\n');
    
    const urls = [
        {
            name: 'Original URL (should fail)',
            url: 'https://res.cloudinary.com/dzgjbr1xc/video/upload/v1777476999/safetour_evidence/vle5kgnqn40a5eigkjwq.webm'
        },
        {
            name: 'Transformed URL (should work)',
            url: 'https://res.cloudinary.com/dzgjbr1xc/video/upload/ac_audio/v1777476999/safetour_evidence/vle5kgnqn40a5eigkjwq.webm'
        }
    ];
    
    for (const test of urls) {
        console.log(`Testing: ${test.name}`);
        console.log(`URL: ${test.url}`);
        
        try {
            const response = await makeRequest(test.url);
            console.log(`✅ Status: ${response.statusCode}`);
            console.log(`Content-Type: ${response.headers['content-type']}`);
            console.log(`Content-Length: ${response.headers['content-length'] || 'N/A'}`);
            
            if (response.statusCode === 200) {
                const isAudio = response.headers['content-type']?.includes('audio');
                console.log(`🎵 Audio detected: ${isAudio ? 'YES' : 'NO'}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('---');
    }
    
    console.log('\n📝 Summary:');
    console.log('• If original URL works but transformed fails, the transformation is wrong');
    console.log('• If original fails but transformed works, the transformation is correct');
    console.log('• If both work, check content-type to ensure audio is detected');
}

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            resolve(response);
        });
        
        request.on('error', reject);
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

testCloudinaryUrls().catch(console.error);
