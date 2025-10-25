import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useAuth } from './context/Web3Context';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import PublicFiles from './components/PublicFiles';
import Login from './components/Login';
import Register from './components/Register';
import { toast } from 'react-toastify';

function HomePage() {
  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h2" component="h1" gutterBottom>
        🌐 IPFS File Sharing Platform
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        Decentralized file storage and sharing powered by IPFS
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload, share, and collaborate on files stored on the InterPlanetary File System.
        Experience true decentralization with censorship-resistant file storage.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" size="large" onClick={() => window.location.href = '/login'}>
          Get Started
        </Button>
        <Button variant="outlined" size="large" onClick={() => window.location.href = '/public'}>
          Browse Public Files
        </Button>
      </Box>
    </Container>
  );
}

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully!');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IPFS File Sharing
          </Typography>
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body1" sx={{ alignSelf: 'center' }}>
                Welcome, {user?.username}!
              </Typography>
              <Button color="inherit" onClick={() => navigate('/')}>
                Dashboard
              </Button>
              <Button color="inherit" onClick={() => navigate('/upload')}>
                Upload
              </Button>
              <Button color="inherit" onClick={() => navigate('/public')}>
                Public Files
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button color="inherit" onClick={() => navigate('/public')}>
                Public Files
              </Button>
              <Button color="inherit" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button color="inherit" onClick={() => navigate('/register')}>
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <HomePage />} />
        <Route path="/upload" element={user ? <FileUpload /> : <Navigate to="/login" />} />
        <Route path="/public" element={<PublicFiles />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      </Routes>
    </Box>
  );
}

export default App;
