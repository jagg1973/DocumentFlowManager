// Script to test document linking functionality
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

// Use app service name when running inside Docker, or localhost for external access
const API_BASE = process.env.DOCKER_ENV ? 'http://app:5000/api' : 'http://localhost:5000/api';
let cookies = '';

// Login to get session cookies
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'jaguzman123@hotmail.com',
      password: 'password'
    }, {
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 303;
      }
    });
    
    // Get cookies from response
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'];
      console.log('Login successful!');
      fs.writeFileSync('./cookies.txt', cookies.join('; '));
      return true;
    }
  } catch (error) {
    console.error('Login error:', error.response?.status, error.response?.data || error.message);
  }
  return false;
}

// Get available tasks
async function getTasks() {
  try {
    const response = await axios.get(`${API_BASE}/projects`, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('Projects:', response.data);
    
    // Get tasks for the first project
    if (response.data && response.data.length > 0) {
      const projectId = response.data[0].id;
      const tasksResponse = await axios.get(`${API_BASE}/projects/${projectId}/tasks`, {
        headers: {
          Cookie: cookies
        }
      });
      
      console.log('Tasks:', tasksResponse.data);
      return tasksResponse.data;
    }
  } catch (error) {
    console.error('Get tasks error:', error.response?.status, error.response?.data || error.message);
  }
  return [];
}

// Get a specific project
async function getProject(projectId) {
  try {
    const response = await axios.get(`${API_BASE}/projects/${projectId}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('Project details:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get project error:', error.response?.status, error.response?.data || error.message);
  }
  return null;
}

// Get available documents
async function getDocuments() {
  try {
    const response = await axios.get(`${API_BASE}/documents`, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('Documents:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get documents error:', error.response?.status, error.response?.data || error.message);
  }
  return [];
}

// Link a document to a task
async function linkDocumentToTask(taskId, documentId) {
  try {
    const response = await axios.post(`${API_BASE}/tasks/${taskId}/documents`, {
      documentId
    }, {
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Document linked:', response.data);
    return response.data;
  } catch (error) {
    console.error('Link document error:', error.response?.status, error.response?.data || error.message);
  }
  return null;
}

// Get linked documents for a task
async function getLinkedDocuments(taskId) {
  try {
    const response = await axios.get(`${API_BASE}/tasks/${taskId}/documents`, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('Linked documents:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get linked documents error:', error.response?.status, error.response?.data || error.message);
  }
  return [];
}

// Run the test
async function runTest() {
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Failed to login. Cannot continue.');
    return;
  }
  
  // Get projects to find a project ID
  const projectsResponse = await axios.get(`${API_BASE}/projects`, {
    headers: {
      Cookie: cookies
    }
  });
  
  if (!projectsResponse.data || projectsResponse.data.length === 0) {
    console.error('No projects found. Cannot continue.');
    return;
  }
  
  const projectIdToTest = projectsResponse.data[0].id;
  console.log(`Testing with project ID: ${projectIdToTest}`);
  
  // Get specific project
  const project = await getProject(projectIdToTest);
  if (!project) {
    console.error(`Failed to get project ${projectIdToTest}.`);
    // We can continue to test other things
  }
  
  // Get tasks
  const tasks = await getTasks();
  if (!tasks || tasks.length === 0) {
    console.error('No tasks found. Cannot continue.');
    return;
  }
  
  // Get documents
  const documents = await getDocuments();
  if (!documents || documents.length === 0) {
    console.error('No documents found. Cannot continue.');
    return;
  }
  
  // Link a document to the first task
  const taskId = tasks[0].id;
  const documentId = documents[0].id;
  
  console.log(`Linking document ${documentId} to task ${taskId}...`);
  const link = await linkDocumentToTask(taskId, documentId);
  
  if (link) {
    console.log('Link created successfully!');
    
    // Verify the link was created
    const linkedDocs = await getLinkedDocuments(taskId);
    if (linkedDocs && linkedDocs.length > 0) {
      console.log('Verification successful! Found linked documents.');
    }
  }
}

runTest();
