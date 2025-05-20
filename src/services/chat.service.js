const ChatModel = require('../models/chat.model.js');
const axios = require('axios');
const JobModel = require('../models/job.model.js');

/**
 * Service for handling AI chat operations
 */
class ChatService {
  /**
   * Create a new chat session
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @param {string} jobId - Optional job ID for context
   * @returns {Promise<Object>} Created chat
   */
  async createChat(userId, transactionId, jobId = null) {
    try {
      // Create initial message
      const initialMessages = [{
        role: 'AI',
        content: jobId 
          ? 'Hello! I can help you with your job application. What would you like to know about this position?'
          : 'Hello! How can I assist you with your job search today?',
        timestamp: new Date()
      }];
      
      // Create chat
      const chat = new ChatModel({
        userId,
        jobId: jobId || undefined,
        messages: initialMessages,
        transactionId
      });
      
      await chat.save();
      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat');
    }
  }

  /**
   * Add message to chat and get AI response
   * @param {string} chatId - Chat ID
   * @param {string} message - User message
   * @returns {Promise<Object>} Updated chat
   */
  async sendMessage(chatId, message) {
    try {
      // Get chat
      const chat = await ChatModel.findById(chatId);
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Add user message
      chat.messages.push({
        role: 'USER',
        content: message,
        timestamp: new Date()
      });
      
      // Save chat to update with user message
      await chat.save();
      
      // Get job context if available
      let jobContext = '';
      if (chat.jobId) {
        const job = await JobModel.findById(chat.jobId);
        if (job) {
          jobContext = `
            This conversation is about the following job:
            Title: ${job.title}
            Company: ${job.company}
            Description: ${job.description}
            Requirements: ${job.requirements.join(', ')}
            Salary Range: ${job.salary.min}-${job.salary.max} ${job.salary.currency}
            Location: ${job.location}
            Type: ${job.type}
          `;
        }
      }
      
      // Get all jobs for context if no specific job
      else {
        const recentJobs = await JobModel.find()
          .sort({ postedAt: -1 })
          .limit(5);
        
        if (recentJobs.length > 0) {
          jobContext = 'Here are some recent jobs that might be relevant:\n';
          recentJobs.forEach(job => {
            jobContext += `
              Title: ${job.title}
              Company: ${job.company}
              Location: ${job.location}
              Type: ${job.type}
              ---
            `;
          });
        }
      }
      
      // Format conversation history for AI
      const conversationHistory = chat.messages.map(msg => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Get AI response from DeepSeek API (or similar)
      const aiResponse = await this.getAIResponse(conversationHistory, jobContext);
      
      // Add AI response to chat
      chat.messages.push({
        role: 'AI',
        content: aiResponse,
        timestamp: new Date()
      });
      
      chat.updatedAt = new Date();
      await chat.save();
      
      return chat;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Get AI response from DeepSeek API
   * @param {Array} messages - Conversation history
   * @param {string} context - Additional context
   * @returns {Promise<string>} AI response
   */
  async getAIResponse(messages, context = '') {
    try {
      // Example with DeepSeek API - adjust to actual API format
      const systemPrompt = `You are a helpful career assistant that helps people find and apply for jobs. 
        Give concise, practical advice. ${context}`;
      
      const apiKey = process.env.DEEPSEEK_API_KEY;
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      // Extract response from DeepSeek API
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I'm sorry, I'm having trouble generating a response right now. Please try again later.";
    }
  }

  /**
   * Get chat history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Chat history
   */
  async getChatHistory(userId) {
    try {
      const chats = await ChatModel.find({ userId })
        .populate('jobId', 'title company')
        .sort({ updatedAt: -1 });
      
      return chats;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw new Error('Failed to get chat history');
    }
  }

  /**
   * Get a specific chat by ID
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Chat object
   */
  async getChatById(chatId, userId) {
    try {
      const chat = await ChatModel.findOne({
        _id: chatId,
        userId
      }).populate('jobId', 'title company');
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      return chat;
    } catch (error) {
      console.error('Error getting chat:', error);
      throw new Error('Failed to get chat');
    }
  }
}

module.exports = new ChatService();