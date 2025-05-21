const app = require('./app.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    console.log('MongoDB connected successfully');
    
    // Cargar los trabajos en la base de datos (LÍNEA AÑADIDA)
    const jobService = require('./services/job.service.js');
    await jobService.seedJobs();
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database and start server
(async () => {
  await connectDB();
  
  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();