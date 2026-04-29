const https = require('https');

async function testCloudinaryFix() {
    console.log('🔍 Testing Cloudinary Audio Fix...\n');
    
    const originalUrl = 'https://res.cloudinary.com/dzgjbr1xc/video/upload/v1777476999/safetour_evidence/vle5kgnqn40a5eigkjwq.webm';
    
    const urls = [
        {
            name: 'Original URL',
            url: originalUrl
        },
        {
            name: 'Fixed URL with audio parameters',
            url: originalUrl + '?resource_type=video&audio_codec=opus'
        },
        {
            name: 'Alternative: Force audio format',
            url: originalUrl + '?format=webm&resource_type=video'
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
                const isVideo = response.headers['content-type']?.includes('video');
                console.log(`🎵 Audio detected: ${isAudio ? 'YES' : 'NO'}`);
                console.log(`🎬 Video detected: ${isVideo ? 'YES' : 'NO'}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('---');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('• If any URL returns audio content-type, use that approach');
    console.log('• If all return video, we may need to fix the upload process');
    console.log('• Consider forcing audio-only upload in Cloudinary');
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

testCloudinaryFix().catch(console.error);
