# DJ Library Manager

A comprehensive music library management system designed for DJs, featuring audio analysis, playlist generation, crate organization, and Serato integration.

## Features

- **Music Library Management**: Organize and manage your entire music collection
- **Audio Analysis**: Automatic BPM detection, key detection, and audio feature extraction
- **Smart Playlists**: AI-powered playlist generation based on musical characteristics
- **Crate Management**: Create and organize crates for different events and sets
- **Serato Integration**: Sync with Serato DJ library and settings
- **Advanced Search**: Search tracks by multiple criteria including BPM, key, genre, and more
- **Analytics Dashboard**: Track your listening habits and music collection statistics
- **Audio Player**: Built-in audio player with waveform visualization

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: Better-SQLite3 (embedded SQLite database)
- **Audio Processing**:
  - music-metadata for metadata extraction
  - sharp for image processing
- **File Monitoring**: Chokidar for real-time library updates
- **Security**: Helmet for HTTP security headers, CORS enabled

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v7
- **UI Components**:
  - Radix UI primitives
  - Tailwind CSS for styling
  - Lucide React for icons
- **Notifications**: Sonner toast notifications

## Project Structure

```
dj-library-manager/
├── backend/
│   ├── src/
│   │   ├── services/        # Business logic services
│   │   │   ├── DatabaseService.ts
│   │   │   ├── AudioAnalyzer.ts
│   │   │   ├── LibraryScanner.ts
│   │   │   ├── PlaylistGenerator.ts
│   │   │   ├── SeratoService.ts
│   │   │   ├── SeratoSyncService.ts
│   │   │   └── FileWatcherService.ts
│   │   ├── routes/          # API routes
│   │   │   ├── library.ts
│   │   │   ├── playlists.ts
│   │   │   ├── crates.ts
│   │   │   ├── search.ts
│   │   │   ├── analytics.ts
│   │   │   └── serato.ts
│   │   ├── middleware/      # Express middleware
│   │   │   └── errorHandler.ts
│   │   └── utils/           # Utility functions
│   │       └── logger.ts
│   ├── database/            # SQLite database files
│   ├── uploads/             # Uploaded audio files
│   └── logs/                # Application logs
│
└── frontend/
    ├── src/
    │   ├── features/        # Feature-based modules
    │   │   ├── library/
    │   │   ├── playlists/
    │   │   ├── crates/
    │   │   ├── search/
    │   │   ├── analytics/
    │   │   └── audio/
    │   ├── components/      # Reusable components
    │   │   ├── ui/          # UI primitives
    │   │   └── common/      # Shared components
    │   ├── store/           # Redux store
    │   │   ├── slices/      # Redux slices
    │   │   └── middleware/  # Custom middleware
    │   ├── services/        # API services
    │   ├── hooks/           # Custom React hooks
    │   ├── lib/             # Utility libraries
    │   └── types/           # TypeScript type definitions
    └── public/              # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 22.2.0)
- npm 10+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dj-library-manager
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Running the Application

#### Development Mode

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a separate terminal, start the frontend development server:
```bash
cd frontend
npm run dev
```

The backend API will be available at `http://localhost:3000` (or configured port)
The frontend will be available at `http://localhost:5173` (Vite default)

#### Production Build

1. Build the backend:
```bash
cd backend
npm run build
npm start
```

2. Build the frontend:
```bash
cd frontend
npm run build
npm run preview
```

## Configuration

Backend configuration is managed through environment variables. Create a `.env` file in the backend directory:

```env
PORT=3000
DATABASE_PATH=./database/library.db
UPLOAD_DIR=./uploads
LOG_LEVEL=info
```

## API Documentation

### Endpoints

- **Library**: `/api/library` - Music library management
- **Playlists**: `/api/playlists` - Playlist CRUD operations
- **Crates**: `/api/crates` - Crate management
- **Search**: `/api/search` - Advanced search functionality
- **Analytics**: `/api/analytics` - Library statistics and insights
- **Serato**: `/api/serato` - Serato integration

## Features in Detail

### Audio Analysis
The system automatically analyzes uploaded tracks for:
- BPM (Beats Per Minute)
- Musical key
- Energy level
- Danceability
- Valence (musical positivity)
- Acousticness
- Intro/outro detection
- Waveform generation

### Smart Playlist Generation
Create intelligent playlists based on:
- Musical compatibility (key and BPM)
- Audio features similarity
- Genre and mood
- Custom criteria

### Serato Integration
- Import Serato crates and playlists
- Sync metadata changes
- Export to Serato-compatible formats

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Troubleshooting

### npm install issues
If you encounter issues with `npm install`, ensure Node.js is properly installed and in your PATH:

```bash
node --version
npm --version
```

For macOS users with multiple Node versions, you may need to set your PATH:
```bash
export PATH="/usr/local/n/versions/node/22.2.0/bin:$PATH"
```

### Database issues
If the database becomes corrupted, you can reset it by deleting the database file:
```bash
rm backend/database/library.db
```
The application will recreate it on next startup.

## Acknowledgments

- Built with modern web technologies
- Inspired by professional DJ software
- Community-driven development
