import React, { useState } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  LinearProgress,
  Alert
} from '@mui/material';
import { CloudUpload, Upload } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/Web3Context';
import { fileAPI } from '../services/api';
import { toast } from 'react-toastify';

const FileUpload = () => {
  const { isAuthenticated } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileDescription, setFileDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        toast.error('File size exceeds 10MB limit. Please choose a smaller file.');
      } else {
        toast.error('File type not supported or file too large');
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      toast.info(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
      'application/zip': ['.zip'],
      'application/json': ['.json']
    },
    maxSize: 10 * 1024 * 1024, // 10MB limit for free tier optimization
    multiple: false
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in to upload files');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', fileDescription);
      formData.append('isPublic', isPublic.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fileAPI.uploadFile(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('File uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setFileDescription('');
      setIsPublic(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CloudUpload sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          Upload File
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            {isDragActive ? (
              <Typography variant="h6">Drop the file here...</Typography>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Drag & drop a file here, or click to select
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supports images, PDFs, text files, and archives (max 100MB)
                </Typography>
              </Box>
            )}
          </Box>

          {selectedFile && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Selected File:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
              </Alert>
            </Box>
          )}

          <TextField
            fullWidth
            label="Description (optional)"
            multiline
            rows={3}
            value={fileDescription}
            onChange={(e) => setFileDescription(e.target.value)}
            sx={{ mt: 3 }}
            placeholder="Add a description for your file..."
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                color="primary"
              />
            }
            label="Make this file public"
            sx={{ mt: 2, display: 'block' }}
          />

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Uploading... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              fullWidth
            >
              {uploading ? 'Uploading...' : 'Upload to IPFS'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default FileUpload;
