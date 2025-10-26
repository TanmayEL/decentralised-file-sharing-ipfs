const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sharp = require('sharp');
const zlib = require('zlib');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://ipfs-file-sharing.netlify.app',
    'https://ipfs-file-sharing.netlify.app/',
    'http://ipfs-file-sharing.netlify.app',
    'http://ipfs-file-sharing.netlify.app/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// rate limiting to prevent spam
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ipfs-files', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const dbConnection = mongoose.connection;
dbConnection.on('error', console.error.bind(console, 'MongoDB connection error:'));
dbConnection.once('open', () => { console.log('Connected to MongoDB'); });

// file schema for storing file info
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  originalSize: { type: Number },
  compressed: { type: Boolean, default: false },
  type: { type: String, required: true },
  ipfsHash: { type: String, required: true, unique: true },
  uploadDate: { type: Date, default: Date.now },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  accessList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  description: { type: String, default: '' }
});

// user schema (for login)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  createdAt: { type: Date, default: Date.now }
});

// hash password before saving (security)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// compare password method (login)
userSchema.methods.comparePassword = async function(candidatePassword) { return bcrypt.compare(candidatePassword, this.password); };

const File = mongoose.model('File', fileSchema);
const User = mongoose.model('User', userSchema);

// jwt auth middleware (check if user is logged in)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) { return res.status(401).json({ error: 'Access token required' }); }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) { return res.status(403).json({ error: 'Invalid or expired token' }); }
    req.user = user;
    next();
  });
};

// multer config for file uploads (handles the files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// file compression utilities
const compressFile = async (filePath, originalName) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // if file is already small, don't compress
    if (fileSize < 1024 * 1024) { // less than 1MB
      return { filePath, compressed: false, originalSize: fileSize };
    }

    const ext = path.extname(originalName).toLowerCase();
    const compressedPath = filePath + '.compressed';

    // compress images using sharp
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      await sharp(filePath)
        .jpeg({ quality: 80, progressive: true })
        .png({ compressionLevel: 8 })
        .webp({ quality: 80 })
        .toFile(compressedPath);
      
      const compressedStats = fs.statSync(compressedPath);
      const compressionRatio = (1 - compressedStats.size / fileSize) * 100;
      
      console.log(`Image compressed: ${(fileSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedStats.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reduction)`);
      
      // use compressed version if its significantly smaller
      if (compressedStats.size < fileSize * 0.9) {
        fs.unlinkSync(filePath); // delete original
        return { filePath: compressedPath, compressed: true, originalSize: fileSize, compressedSize: compressedStats.size };
      } else {
        fs.unlinkSync(compressedPath); // delete compressed if not better
        return { filePath, compressed: false, originalSize: fileSize };
      }
    }
    
    // for other files, use gzip compression
    const gzip = zlib.createGzip();
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(compressedPath);
    
    await new Promise((resolve, reject) => {
      input.pipe(gzip).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
    
    const compressedStats = fs.statSync(compressedPath);
    const compressionRatio = (1 - compressedStats.size / fileSize) * 100;
    
    console.log(`File compressed: ${(fileSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedStats.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reduction)`);
    
    // use compressed version if its significantly smaller
    if (compressedStats.size < fileSize * 0.8) {
      fs.unlinkSync(filePath); // delete original
      return { filePath: compressedPath, compressed: true, originalSize: fileSize, compressedSize: compressedStats.size };
    } else {
      fs.unlinkSync(compressedPath); // delete compressed if not better
      return { filePath, compressed: false, originalSize: fileSize };
    }
  } catch (error) {
    console.error('Compression error:', error);
    return { filePath, compressed: false, originalSize: fs.statSync(filePath).size };
  }
};

// cleanup old files (7 days and older)
const cleanupOldFiles = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // find files older than 7 days
    const oldFiles = await File.find({
      uploadDate: { $lt: sevenDaysAgo }
    });
    
    console.log(`Found ${oldFiles.length} files older than 7 days`);
    
    for (const file of oldFiles) {
      try {
        // unpin from Pinata
        if (file.ipfsHash) {
          await axios.delete(`https://api.pinata.cloud/pinning/unpin/${file.ipfsHash}`, {
            headers: {
              'pinata_api_key': pinataConfig.apiKey,
              'pinata_secret_api_key': pinataConfig.secretKey
            }
          });
          console.log(`Unpinned file: ${file.name} (${file.ipfsHash})`);
        }
        
        // delete from database
        await File.findByIdAndDelete(file._id);
        console.log(`Deleted file record: ${file.name}`);
      } catch (error) {
        console.error(`Error cleaning up file ${file.name}:`, error.message);
      }
    }
    
    console.log(`Cleanup completed. Removed ${oldFiles.length} old files.`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// run cleanup every 24 hours
setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);

// ipfs setup for pinata (this took me forever to figure out)
const axios = require('axios');
const FormData = require('form-data');

let pinataConfig = {
  apiKey: process.env.PINATA_API_KEY,
  secretKey: process.env.PINATA_SECRET_KEY
};

console.log('Pinata IPFS client configured');

// routes (all the api endpoints)

// Root route for debugging
app.get('/', (req, res) => {
  res.json({ message: 'IPFS File Sharing Backend API' });
});

// health check (to see if server is running)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// user registration (sign up)
app.post('/api/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists (dont want duplicates)
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    // Create new user (finally!)
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token (for keeping them logged in)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) { return res.status(401).json({ error: 'Invalid credentials' }); }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) { return res.status(401).json({ error: 'Invalid credentials' }); }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) { return res.status(404).json({ error: 'User not found' }); }
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File upload
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // check file size limit (10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      fs.unlinkSync(req.file.path); // delete uploaded file
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    if (!pinataConfig.apiKey || !pinataConfig.secretKey) {
      return res.status(500).json({ error: 'Pinata configuration not available' });
    }

    const { isPublic, description } = req.body;
    let filePath = req.file.path;
    let finalSize = req.file.size;

    // compress file before upload
    console.log(`Compressing file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
    const compressionResult = await compressFile(filePath, req.file.originalname);
    filePath = compressionResult.filePath;
    finalSize = compressionResult.compressedSize || compressionResult.originalSize;

    // Upload file to Pinata IPFS
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('pinataMetadata', JSON.stringify({
      name: req.file.originalname,
      compressed: compressionResult.compressed
    }));
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 0
    }));

    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'pinata_api_key': pinataConfig.apiKey,
        'pinata_secret_api_key': pinataConfig.secretKey,
        ...formData.getHeaders()
      }
    });

    const ipfsHash = pinataResponse.data.IpfsHash;

    // Save file metadata to database
    const file = new File({
      name: req.file.originalname,
      size: finalSize,
      originalSize: compressionResult.originalSize,
      compressed: compressionResult.compressed,
      type: req.file.mimetype,
      ipfsHash: ipfsHash,
      uploader: req.user.userId,
      isPublic: isPublic === 'true',
      description: description || ''
    });

    await file.save();

    // Update user's files array
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { files: file._id }
    });

    // Clean up local file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        type: file.type,
        ipfsHash: file.ipfsHash,
        uploadDate: file.uploadDate,
        isPublic: file.isPublic,
        description: file.description
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Download file
app.get('/api/file/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;
    const file = await File.findOne({ ipfsHash: hash }).populate('uploader');

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const hasAccess = file.isPublic || 
                     file.uploader._id.toString() === req.user.userId ||
                     file.accessList.includes(req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file from Pinata IPFS gateway
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
    
    // Redirect to Pinata gateway for file download
    res.redirect(gatewayUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
});

// Get file metadata
app.get('/api/metadata/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;
    const file = await File.findOne({ ipfsHash: hash }).populate('uploader');

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const hasAccess = file.isPublic || 
                     file.uploader._id.toString() === req.user.userId ||
                     file.accessList.includes(req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: file._id,
      name: file.name,
      size: file.size,
      type: file.type,
      ipfsHash: file.ipfsHash,
      uploadDate: file.uploadDate,
      uploader: {
        id: file.uploader._id,
        username: file.uploader.username
      },
      isPublic: file.isPublic,
      description: file.description
    });
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// Get user's files
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({
      $or: [
        { uploader: req.user.userId },
        { accessList: req.user.userId }
      ]
    }).populate('uploader', 'username').sort({ uploadDate: -1 });

    res.json({ files });
  } catch (error) {
    console.error('Files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Get public files
app.get('/api/public-files', async (req, res) => {
  try {
    const files = await File.find({ isPublic: true })
      .populate('uploader', 'username')
      .sort({ uploadDate: -1 })
      .limit(50);

    res.json({ files });
  } catch (error) {
    console.error('Public files error:', error);
    res.status(500).json({ error: 'Failed to get public files' });
  }
});

// Share file with specific users
app.post('/api/share/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;
    const { userIds } = req.body;

    const file = await File.findOne({ ipfsHash: hash });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file
    if (file.uploader.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only file owner can share' });
    }

    // Add users to access list
    file.accessList = [...new Set([...file.accessList, ...userIds])];
    await file.save();

    res.json({ message: 'File shared successfully' });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
});

// Delete file
app.delete('/api/file/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;
    const file = await File.findOne({ ipfsHash: hash });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file
    if (file.uploader.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only file owner can delete' });
    }

    // Remove from user's files array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { files: file._id }
    });

    // Delete file record
    await File.findByIdAndDelete(file._id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });