const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const SOSAlert = require('./src/models/SOSAlert');

async function checkAudioInDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('Please set MONGODB_URI in .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    
    const alerts = await SOSAlert.find({ 
      'evidence.audioUrl': { $exists: true, $ne: '' } 
    }).sort({ createdAt: -1 }).limit(3);
    
    console.log('🔍 Recent SOS alerts with audio:');
    alerts.forEach((alert, index) => {
      console.log(`\n${index + 1}. Alert ID: ${alert._id}`);
      console.log(`   Audio URL: ${alert.evidence.audioUrl}`);
      console.log(`   Created: ${alert.createdAt}`);
      console.log(`   Status: ${alert.status}`);
      
      // Check if URL is Cloudinary
      if (alert.evidence.audioUrl.includes('res.cloudinary.com')) {
        console.log(`   Type: Cloudinary`);
        
        // Apply transformation
        const transformed = alert.evidence.audioUrl.replace('/video/upload/', '/video/upload/ac_audio/');
        console.log(`   Transformed: ${transformed}`);
      } else {
        console.log(`   Type: Local`);
      }
    });
    
    if (alerts.length === 0) {
      console.log('❌ No SOS alerts with audio found in database');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAudioInDatabase();
