# 🌐 IPFS File Sharing Platform

A decentralized file sharing application that stores files on the InterPlanetary File System (IPFS) using Pinata as the IPFS pinning service. Users can upload, share, and collaborate on files pubbblicly with a modern React frontend and Node.js backend. Features automatic file compression, upload limits, and cleanup for optimal free tier usage.

## Live Application

Access the application directly through these URLs:

- **Frontend**: [https://ipfs-file-sharing.netlify.app](https://ipfs-file-sharing.netlify.app)
- **Backend API**: [https://ipfs-file-sharing-backend.vercel.app](https://ipfs-file-sharing-backend.vercel.app)

### Quick Start Guide
1. Visit [https://ipfs-file-sharing.netlify.app](https://ipfs-file-sharing.netlify.app)
2. Register a new account or login
3. Start uploading and sharing files!

### Usage Limits
- Maximum file size: 10MB
- Files are automatically removed after 7 days
- Storage and bandwidth limits apply (Pinata free tier)

## Features

- **Decentralized Storage**: Files stored on IPFS network via Pinata
- **User Authentication**: Email/password authentication with JWT tokens
- **File Management**: Upload, download, share, and delete files
- **Access Control**: Public files and private file sharing
- **File Compression**: Automatic compression of images and files to optimize storage
- **Upload Limits**: 10MB file size limit for free tier optimization
- **Auto Cleanup**: Automatic removal of files older than 7 days
- **Modern UI**: Material-UI components with responsive design
- **Real-time Updates**: Toast notifications and loading states

## Technology Stack

### Frontend
- **React**: UI framework
- **Material-UI**: Component library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **React Dropzone**: File upload UI
- **React Toastify**: Notifications

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: Database for metadata
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication tokens
- **IPFS**: Decentralized file storage
- **Pinata**: IPFS pinning service
- **Sharp**: Image compression library

### Infrastructure
- **IPFS**: Decentralized file storage
- **Pinata**: IPFS pinning and gateway service
- **MongoDB Atlas**: Cloud database
- **Vercel**: Backend hosting
- **Netlify**: Frontend hosting
- **JWT**: Stateless authentication

## Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Stateless token-based auth
- **Input Validation**: express-validator for request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Controlled cross-origin access
- **Helmet**: Security headers

## IPFS Integration

### How It Works
1. **File Upload**: Files are compressed and uploaded to IPFS via Pinata
2. **Content Addressing**: Files get unique IPFS hashes
3. **Pinning**: Pinata ensures file persistence on IPFS network
4. **Global Access**: Files accessible via IPFS gateways worldwide
5. **Metadata Storage**: File information stored in MongoDB Atlas

### Benefits
- **Decentralized**: No single point of failure
- **Immutable**: Files cannot be modified
- **Global**: Accessible worldwide
- **Efficient**: Deduplication saves space
- **Censorship Resistant**: Distributed storage

## 💻 Local Development

If you want to run the project locally or contribute, check out the [Development Guide](DEVELOPMENT.md).


**Built with ❤️ for the decentralized web**
