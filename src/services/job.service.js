const JobModel = require('../models/job.model.js');
const UserJobModel = require('../models/user-job.model.js');
const fs = require('fs');
const path = require('path');

/**
 * Service for handling job operations
 */
class JobService {
  /**
   * Get jobs from local JSON file
   * @returns {Promise<Array>} Array of jobs
   */
  async getJobsFromJson() {
    try {
      console.log("Intentando leer el archivo JSON...");
      const filePath = path.join(__dirname, '../../data/jobs.json');
      console.log("Ruta del archivo:", filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error(`¡El archivo no existe en la ruta ${filePath}!`);
        return [];
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      console.log(`Archivo leído. Tamaño: ${data.length} bytes`);
      
      const jobs = JSON.parse(data);
      console.log(`JSON parseado correctamente. Se encontraron ${jobs.length} trabajos.`);
      
      return jobs;
    } catch (error) {
      console.error('Error al leer o parsear el archivo JSON:', error);
      return [];
    }
  }

  /**
   * Seed database with jobs
   * @returns {Promise<void>}
   */
  async seedJobs() {
    try {
      console.log("Iniciando proceso de carga de trabajos...");
      
      // Forzar la eliminación de trabajos existentes
      const existingCount = await JobModel.countDocuments();
      console.log(`Se encontraron ${existingCount} trabajos existentes en la base de datos.`);
      
      if (existingCount > 0) {
        console.log("Eliminando trabajos existentes...");
        await JobModel.deleteMany({});
        console.log("Trabajos existentes eliminados.");
      }
      
      // Cargar trabajos desde el JSON
      const jobs = await this.getJobsFromJson();
      
      if (jobs && jobs.length > 0) {
        console.log(`Insertando ${jobs.length} trabajos en la base de datos...`);
        
        // Insertar trabajos con manejo de errores
        try {
          await JobModel.insertMany(jobs);
          console.log(`¡${jobs.length} trabajos insertados correctamente!`);
          
          // Verificar que los trabajos se insertaron
          const insertedCount = await JobModel.countDocuments();
          console.log(`Verificación: Hay ${insertedCount} trabajos en la base de datos.`);
          
          // Verificar categorías disponibles
          const categories = await JobModel.distinct('category');
          console.log(`Categorías disponibles: ${categories.join(', ')}`);
        } catch (insertError) {
          console.error('Error al insertar trabajos:', insertError);
          
          // Intentar insertar uno por uno para identificar problemas
          if (insertError.name === 'ValidationError' || insertError.name === 'BulkWriteError') {
            console.log("Intentando insertar trabajos individualmente para identificar errores...");
            let successCount = 0;
            
            for (let i = 0; i < jobs.length; i++) {
              try {
                const job = new JobModel(jobs[i]);
                await job.save();
                successCount++;
              } catch (individualError) {
                console.error(`Error al insertar trabajo #${i + 1}:`, individualError);
              }
            }
            
            console.log(`Se insertaron ${successCount} de ${jobs.length} trabajos individualmente.`);
          }
        }
      } else {
        console.error("No se encontraron trabajos en el archivo JSON.");
      }
    } catch (error) {
      console.error('Error general en la carga de trabajos:', error);
    }
  }

  /**
   * Get jobs with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated jobs
   */
  async getJobs(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      // Verificar que hay trabajos en la base de datos
      const totalJobs = await JobModel.countDocuments();
      console.log(`Total de trabajos en la base de datos: ${totalJobs}`);
      
      // Si no hay trabajos, intentar cargarlos
      if (totalJobs === 0) {
        console.log("No hay trabajos en la base de datos. Intentando cargarlos...");
        await this.seedJobs();
      }
      
      const query = {};
      
      // Apply filters
      if (filters.search) {
        // Buscar en título, descripción, empresa y categoría
        query.$or = [
          { title: { $regex: new RegExp(filters.search, 'i') } },
          { description: { $regex: new RegExp(filters.search, 'i') } },
          { company: { $regex: new RegExp(filters.search, 'i') } },
          { category: { $regex: new RegExp(filters.search, 'i') } }
        ];
      }
      
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.type) {
        query.type = filters.type;
      }
      
      if (filters.location) {
        query.location = { $regex: new RegExp(filters.location, 'i') };
      }
      
      if (filters.remote) {
        query.remote = filters.remote === 'true';
      }
      
      if (filters.minSalary) {
        query['salary.min'] = { $gte: Number(filters.minSalary) };
      }
      
      // Only show active jobs (si existe el campo)
      if ('active' in JobModel.schema.paths) {
        query.active = true;
      }
      
      console.log("Filtros aplicados:", JSON.stringify(query));
      
      // Calculate pagination
      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Execute query with pagination
      const jobs = await JobModel.find(query)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      console.log(`Se encontraron ${jobs.length} trabajos que coinciden con los filtros.`);
      
      // Get total count for pagination
      const total = await JobModel.countDocuments(query);
      
      return {
        jobs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error al obtener trabajos:', error);
      throw new Error('Failed to get jobs');
    }
  }

  /**
   * Get a single job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job object
   */
  async getJobById(jobId) {
    try {
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      return job;
    } catch (error) {
      console.error('Error al obtener trabajo por ID:', error);
      throw new Error('Failed to get job');
    }
  }

  /**
   * Mark a job as interested or discarded
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @param {string} status - Status (INTERESTED or DISCARDED)
   * @returns {Promise<Object>} Updated user-job relation
   */
  async updateJobStatus(userId, jobId, status) {
    try {
      // Validate status
      if (!['INTERESTED', 'DISCARDED'].includes(status)) {
        throw new Error('Invalid status');
      }
      
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Find or create user-job relation
      let userJob = await UserJobModel.findOne({ userId, jobId });
      
      if (userJob) {
        userJob.status = status;
        userJob.updatedAt = new Date();
      } else {
        userJob = new UserJobModel({
          userId,
          jobId,
          status
        });
      }
      
      await userJob.save();
      return userJob;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw new Error('Failed to update job status');
    }
  }

  /**
   * Generate application link for a job
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Updated user-job relation with link
   */
  async generateJobLink(userId, jobId, transactionId) {
    try {
      const job = await JobModel.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Find user-job relation
      let userJob = await UserJobModel.findOne({ userId, jobId });
      
      if (!userJob) {
        userJob = new UserJobModel({
          userId,
          jobId,
          status: 'INTERESTED'
        });
      }
      
      // Generate unique application link
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const generatedLink = `${process.env.API_BASE_URL || 'http://localhost:3000'}/apply/${jobId}/${uniqueId}`;
      
      userJob.generatedLink = generatedLink;
      userJob.status = 'APPLIED';
      userJob.transactionId = transactionId;
      userJob.updatedAt = new Date();
      
      await userJob.save();
      
      // Update user statistics
      await this.updateUserStatistics(userId);
      
      return userJob;
    } catch (error) {
      console.error('Error generating job link:', error);
      throw new Error('Failed to generate job link');
    }
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateUserStatistics(userId) {
    try {
      const User = require('../models/user.model.js'); // Importing here to avoid circular dependency
      
      // Count links generated
      const linksCount = await UserJobModel.countDocuments({
        userId,
        generatedLink: { $exists: true, $ne: null }
      });
      
      // Update user statistics
      await User.findByIdAndUpdate(userId, {
        'statistics.linksGenerated': linksCount
      });
    } catch (error) {
      console.error('Error updating user statistics:', error);
      // Don't throw here to prevent blocking the main operation
    }
  }

  /**
   * Get job categories
   * @returns {Promise<Array>} Array of categories
   */
  async getCategories() {
    try {
      // Intentar obtener categorías de la base de datos
      const categories = await JobModel.distinct('category');
      
      // Si no hay categorías, intentar cargar los trabajos primero
      if (categories.length === 0) {
        console.log("No se encontraron categorías. Intentando cargar trabajos primero...");
        await this.seedJobs();
        return await JobModel.distinct('category');
      }
      
      return categories;
    } catch (error) {
      console.error('Error getting job categories:', error);
      
      // Si hay un error en la base de datos, intentar obtener categorías del JSON directamente
      try {
        const jobs = await this.getJobsFromJson();
        const categories = [...new Set(jobs.map(job => job.category))];
        console.log("Categorías obtenidas directamente del JSON:", categories);
        return categories;
      } catch (jsonError) {
        console.error('Error getting categories from JSON:', jsonError);
        throw new Error('Failed to get job categories');
      }
    }
  }

  /**
   * Get user's job interactions
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of job interactions
   */
  async getUserJobs(userId, status = null) {
    try {
      const query = { userId };
      
      if (status) {
        query.status = status;
      }
      
      const userJobs = await UserJobModel.find(query)
        .populate('jobId')
        .sort({ updatedAt: -1 });
      
      return userJobs;
    } catch (error) {
      console.error('Error getting user jobs:', error);
      throw new Error('Failed to get user jobs');
    }
  }
}

module.exports = new JobService();