import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Download, Share, Delete, CloudUpload } from '@mui/icons-material';
import { useAuth } from '../context/Web3Context';
import { fileAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

const Dashboard = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserFiles();
  }, []);

  const loadUserFiles = async () => {
    try {
      setLoading(true);
      const response = await fileAPI.getUserFiles();
      console.log('User files response:', response.data.files);
      console.log('Current user:', user);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files');
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fileAPI.downloadFile(file.ipfsHash);
      const blob = new Blob([response.data]);
      saveAs(blob, file.name);
      toast.success('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleShare = async (file) => {
    try {
      // for now just copy the file hash to clipboard
      await navigator.clipboard.writeText(file.ipfsHash);
      toast.success('File hash copied to clipboard!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share file');
    }
  };

  const handleDelete = async (file) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await fileAPI.deleteFile(file.ipfsHash);
        setFiles(files.filter(f => f._id !== file._id));
        toast.success('File deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete file');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading your files...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CloudUpload sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          My Files
        </Typography>
      </Box>

      {files.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No files uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload your first file to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" noWrap>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formatFileSize(file.size)}
                    {file.compressed && file.originalSize && (
                      <span style={{ color: '#4caf50', marginLeft: '8px' }}>
                        (compressed from {formatFileSize(file.originalSize)})
                      </span>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(file.uploadDate), 'MMM dd, yyyy')}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={file.isPublic ? 'Public' : 'Private'}
                      color={file.isPublic ? 'success' : 'default'}
                      size="small"
                    />
                    {file.compressed && (
                      <Chip
                        label="Compressed"
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  {file.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {file.description}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    IPFS Hash: {file.ipfsHash.substring(0, 20)}...
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleDownload(file)}
                  >
                    Download
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Share />}
                    onClick={() => handleShare(file)}
                  >
                    Share
                  </Button>
                  {(file.uploader._id === user._id || 
                    file.uploader._id === user.id || 
                    file.uploader === user._id || 
                    file.uploader === user.id) && (
                    <Button
                      size="small"
                      startIcon={<Delete />}
                      onClick={() => handleDelete(file)}
                      color="error"
                    >
                      Delete
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;
