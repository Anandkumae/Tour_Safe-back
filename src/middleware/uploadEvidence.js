const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const path = require("path");

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET);
}

// Custom upload function for audio files to Cloudinary
async function uploadAudioToCloudinary(buffer, filename, folder = "safetour_evidence") {
  try {
    const result = await cloudinary.uploader.upload_stream({
      resource_type: "video", // Cloudinary uses "video" for audio files
      folder: folder,
      format: "webm",
      audio_codec: "opus",
      video_codec: null, // Ensure no video processing
      public_id: `audio_${Date.now()}_${path.parse(filename).name}`
    });
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video", // For audio files
          folder: folder,
          format: "webm",
          public_id: `audio_${Date.now()}_${path.parse(filename).name}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    });
  } catch (error) {
    throw error;
  }
}

function buildUpload(folder = "safetour_evidence") {
  if (!hasCloudinaryConfig()) {
    return null;
  }

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: (req, file) => {
        // Detect file type based on mimetype and extension
        const isAudio = file.mimetype.startsWith('audio/') || 
                        file.originalname?.match(/\.(webm|mp3|wav|ogg|m4a)$/i);
        return isAudio ? "video" : "auto"; // Cloudinary uses "video" for audio files
      },
      format: (req, file) => {
        // For audio files, ensure they're processed as audio
        if (file.mimetype.startsWith('audio/')) {
          return 'webm'; // Force webm for audio files
        }
        return undefined;
      }
    }
  });

  return multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB per file
  });
}

module.exports = { buildUpload, hasCloudinaryConfig, uploadAudioToCloudinary };

