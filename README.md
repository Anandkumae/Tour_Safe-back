# SafeTour AI - Smart Tourist Protection System

A comprehensive dual-dashboard safety platform with real-time emergency response, live tracking, and multimedia evidence support.

## 🚀 Features

### Core Functionality
- **Dual Authentication System**: Tourist and Admin roles with JWT security
- **Real-time Communication**: Socket.IO for instant SOS alerts and location updates
- **Live Location Tracking**: Opt-in GPS tracking with privacy controls
- **Emergency Response**: One-click SOS with audio and image evidence
- **Risk Zone Management**: Geofenced danger areas with automatic alerts
- **Multimedia Evidence**: Cloudinary-powered audio/image uploads with optimized playback

### Tourist Dashboard
- 📍 **Live Location Toggle**: Privacy-first location sharing
- 📸 **Evidence Capture**: Audio recording and photo upload
- 🚨 **Emergency SOS**: Instant alert with location and evidence
- ⚠️ **Risk Alerts**: Automatic notifications in danger zones
- 📊 **Safety Status**: Real-time risk assessment

### Police/Admin Dashboard
- 🗺️ **Live Map View**: Real-time tourist locations and SOS incidents
- 📋 **SOS Management**: Alert status tracking and response coordination
- 🎵 **Audio Playback**: Enhanced audio evidence player with Cloudinary integration
- 📈 **Analytics Panel**: Incident statistics and risk zone monitoring
- 🔄 **Real-time Updates**: Socket.IO powered live data streaming

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19, Vite, Mapbox GL, Socket.IO Client
- **Backend**: Express.js, Socket.IO, MongoDB, Cloudinary
- **Authentication**: JWT with Google OAuth integration
- **File Storage**: Cloudinary cloud storage with local fallback
- **Real-time**: WebSocket connections for live updates

### Project Structure
```
Touraksha/
├── frontend/                 # React dashboard application
│   ├── src/
│   │   ├── pages/           # Dashboard pages (Tourist, Police)
│   │   ├── services/        # API services and utilities
│   │   └── components/      # Reusable UI components
├── backend/                  # Express API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # MongoDB schemas
│   │   ├── middleware/      # Authentication and file upload
│   │   └── config/          # Database and Cloudinary setup
├── ml-service/               # FastAPI risk prediction service
├── docs/                     # Documentation
└── tests/                    # Audio and integration tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas connection
- Cloudinary account (for file storage)
- Python 3.8+ (for ML service)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your credentials
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. ML Service (Optional)

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### Access Points
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:8000

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Cloudinary (for file storage)
CLOUD_NAME=your-cloudinary-name
CLOUD_API_KEY=your-cloudinary-api-key
CLOUD_API_SECRET=your-cloudinary-secret

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🎵 Audio Evidence System

### Problem Solved
Fixed critical audio playback issues where Cloudinary-stored audio files were served as `video/webm` content type, causing playback failures in HTML5 audio elements.

### Solution Implemented
- **Smart Audio Upload**: Custom Cloudinary upload function with proper audio resource handling
- **Enhanced Playback**: Multi-format audio player with video/webm support
- **Automatic Fallback**: Switches to video element if audio element fails
- **Comprehensive Debugging**: Detailed console logging for troubleshooting

### Audio Features
- 🎤 **High-Quality Recording**: Opus codec in WebM container
- ☁️ **Cloud Storage**: Cloudinary integration with automatic backup
- 🔊 **Smart Playback**: Handles multiple content types and codecs
- 📱 **Cross-Platform**: Works on desktop and mobile browsers
- 🔄 **Fallback System**: Multiple playback methods for reliability

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Location & Tracking
- `POST /api/location` - Share location
- `GET /api/location` - Get live locations
- `POST /api/location/risk` - Check risk level

### SOS & Emergency
- `POST /api/alert` - Create SOS alert
- `GET /api/alert/all` - Get all alerts (admin)
- `POST /api/alert/:id/evidence` - Upload evidence
- `PUT /api/alert/:id/respond` - Respond to alert

### Risk Zones
- `GET /api/crime-zones` - Get risk zones
- `POST /api/crime-zones` - Create risk zone (admin)
- `PUT /api/crime-zones/:id` - Update risk zone
- `DELETE /api/crime-zones/:id` - Delete risk zone

## 🧪 Testing

### Audio Playback Tests
```bash
# Test audio URL transformation
node test-cloudinary-simple.js

# Test Cloudinary URLs
node test-cloudinary-fix.js

# Test complete audio flow
node test-audio-complete.js
```

### Database Tests
```bash
# Check audio records in database
node check-audio-db.js
```

### Frontend Tests
Open in browser:
- `http://localhost:5174/test-cloudinary-audio.html` - Audio playback test
- `http://localhost:5174/test-new-audio.html` - Audio recording test

## 🔒 Security Features

- **Privacy-First**: Location tracking is opt-in only
- **Role-Based Access**: Tourist and Admin role separation
- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: HTTPS and secure storage
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Cross-origin request security

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**: Set production environment variables
2. **Database Setup**: Configure MongoDB Atlas
3. **Cloudinary Setup**: Configure file storage
4. **SSL Certificate**: Enable HTTPS
5. **Process Management**: Use PM2 or similar for Node.js

### Docker Deployment (Coming Soon)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📈 Monitoring & Analytics

### Real-time Metrics
- Active tourist count
- SOS alert frequency
- Response times
- Risk zone violations
- System health status

### Performance Monitoring
- API response times
- Database query performance
- File upload speeds
- WebSocket connection health

## 🔄 Development Workflow

### Code Structure
- **Component-Based**: Modular React components
- **RESTful APIs**: Clean API design patterns
- **Middleware Architecture**: Express middleware for common tasks
- **Database Models**: Mongoose schemas with validation

### Best Practices
- **Error Handling**: Comprehensive error catching and logging
- **Testing**: Unit and integration tests
- **Documentation**: Inline code comments and API docs
- **Version Control**: Git workflow with feature branches

## 🐛 Troubleshooting

### Common Issues
1. **Audio Not Playing**: Check browser console for error logs
2. **Location Not Updating**: Verify browser location permissions
3. **SOS Not Sending**: Check backend logs and network connection
4. **File Upload Failing**: Verify Cloudinary configuration

### Debug Tools
- Browser Developer Tools (F12)
- Backend logs in console
- Network tab for API requests
- Database connection tests

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- ESLint for JavaScript linting
- Prettier for code formatting
- Conventional commit messages
- Comprehensive testing

## 📞 Support

### Getting Help
- Check documentation in `/docs`
- Review existing GitHub issues
- Check browser console for errors
- Verify environment configuration

## 🗺️ Roadmap

### Phase 2: Enhanced Safety
- [ ] Crime heatmap visualization
- [ ] Safe route recommendation
- [ ] Push notification system
- [ ] Offline mode support

### Phase 3: AI Integration
- [ ] Machine learning risk prediction
- [ ] Natural language safety assistant
- [ ] Pattern recognition for incident prevention
- [ ] Predictive analytics dashboard

### Phase 4: Advanced Features
- [ ] Voice-activated SOS
- [ ] Automatic emergency detection
- [ ] Multi-language support
- [ ] Mobile app development

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

**SafeTour AI** - Keeping tourists safe with smart technology 🛡️
