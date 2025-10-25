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
import { Download, Public } from '@mui/icons-material';
import { useAuth } from '../context/Web3Context';
import { fileAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

const PublicFiles = () => {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPublicFiles();
  }, []);

  const loadPublicFiles = async () => {
    try {
      setLoading(true);
      const response = await fileAPI.getPublicFiles();
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error loading public files:', error);
      setError('Failed to load public files');
      toast.error('Failed to load public files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    if (!isAuthenticated) {
      toast.error('Please log in to download files');
      return;
    }

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
          Loading public files...
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
        <Public sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          Public Files
        </Typography>
      </Box>

      {files.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No public files available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Be the first to share a public file!
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
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(file.uploadDate), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by {file.uploader.username}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label="Public"
                      color="success"
                      size="small"
                    />
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
                    disabled={!isAuthenticated}
                  >
                    {isAuthenticated ? 'Download' : 'Login to Download'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default PublicFiles;

