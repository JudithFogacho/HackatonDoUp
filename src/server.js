const app = require('./app.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection
// Después de la conexión a MongoDB exitosa
connectDB().then(async () => {
  console.log('MongoDB connected successfully');
  
  // Cargar los trabajos en la base de datos
  const jobService = require('./services/job.service.js');
  await jobService.seedJobs();
  
  // Iniciar el servidor
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});;

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});