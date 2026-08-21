const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

app.get('/api/news/:country', (req, res) => {
  const country = req.params.country;
  
  // Log the Python script path
  const scriptPath = path.join(__dirname, '../backend/news.py');
  console.log('Attempting to run Python script at:', scriptPath);
  
  try {
    const pythonProcess = spawn('python', [scriptPath, country]);
    
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
      console.log('Python stdout:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({ 
        error: 'Failed to start Python process', 
        details: error.message 
      });
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      
      if (code !== 0) {
        res.status(500).json({ 
          error: 'Python script error', 
          code: code,
          stderr: errorString 
        });
        return;
      }

      if (errorString) {
        console.warn('Python warnings:', errorString);
      }

      res.json({ summary: dataString });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 