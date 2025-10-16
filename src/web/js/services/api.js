// Read API URL from meta tag or use default
const getApiBase = () => {
    const metaTag = document.querySelector('meta[name="Api.Address"]');
    const apiUrl = metaTag?.content || 'https://localhost:7108';
    return `${apiUrl}/api/v1`;
};

const API_BASE = getApiBase();
const TOKEN_EXPIRY_DAYS = 7; // Keep session for 7 days

export function setTokens(access, refresh) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + TOKEN_EXPIRY_DAYS);
    
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('tokenExpiry', expiry.toISOString());
}

export function getTokens() {
    // Check if tokens are expired
    const expiry = localStorage.getItem('tokenExpiry');
    if (expiry && new Date(expiry) < new Date()) {
        clearTokens();
        return { accessToken: null, refreshToken: null };
    }
    
    return {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken')
    };
}

export function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
}

async function fetchWithAuth(url, options = {}) {
    const tokens = getTokens();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && tokens?.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${getTokens().accessToken}`;
            return fetch(url, { ...options, headers });
        }
    }

    return response;
}

// Helper to extract error message from response
async function getErrorMessage(response) {
    try {
        const data = await response.json();
        
        // Handle validation errors from ASP.NET
        if (data.errors) {
            const errorMessages = Object.values(data.errors).flat();
            return errorMessages.join(', ');
        }
        
        // Handle single error message
        if (data.message) {
            return data.message;
        }
        
        // Handle title or detail
        if (data.title) {
            return data.title;
        }
        
        if (data.detail) {
            return data.detail;
        }
        
        return JSON.stringify(data);
    } catch {
        return response.statusText || 'An error occurred';
    }
}

async function refreshAccessToken() {
    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: getTokens().refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            setTokens(data.accessToken, data.refreshToken);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    return false;
}

// Auth
export async function checkSession() {
    const tokens = getTokens();
    
    if (!tokens.accessToken) {
        return { user: null };
    }

    try {
        const response = await fetchWithAuth(`${API_BASE}/auth/me`);
        if (response.ok) {
            const user = await response.json();
            return { user, tokens };
        }
    } catch (error) {
        console.error('Session check failed:', error);
        // Clear invalid tokens
        clearTokens();
    }
    return { user: null };
}

export async function register({ email, password, fullName, workspaceName }) {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, workspaceName })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }

    return response.json();
}

export async function verifyEmail({ email, code }) {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return data;
}

export async function resendVerificationCode({ email }) {
    const response = await fetch(`${API_BASE}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend code');
    }

    return response.json();
}

export async function login({ email, password }) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error('Invalid credentials');
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return data;
}

export async function logout() {
    try {
        await fetchWithAuth(`${API_BASE}/auth/logout`, { method: 'POST' });
    } finally {
        clearTokens();
    }
}

// Projects
export async function fetchProjects({ filters = {}, sort = {}, page = 1 }) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.ownerId) params.append('ownerId', filters.ownerId);

    const response = await fetchWithAuth(`${API_BASE}/projects?${params}`);
    if (!response.ok) throw new Error('Failed to fetch projects');

    const projects = await response.json();
    return { rows: projects, columns: [], pageInfo: { page, total: projects.length } };
}

export async function fetchProjectSummary({ projectId, milestoneId }) {
    const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project');

    const project = await response.json();
    return { project, milestone: project.milestones?.find(m => m.id === milestoneId), stats: {} };
}

export async function archiveProject(projectId) {
    const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}/archive`, {
        method: 'POST'
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function restoreProject(projectId) {
    const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}/restore`, {
        method: 'POST'
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function fetchDocuments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.projectId) params.append('projectId', filters.projectId);
    
    const response = await fetchWithAuth(`${API_BASE}/documents?${params}`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
}

export async function getDocumentDownloadUrl(documentId) {
    const response = await fetchWithAuth(`${API_BASE}/documents/${documentId}/download-url`);
    if (!response.ok) throw new Error('Failed to get download URL');
    return response.json();
}

export async function approveDocument(documentId, comment = null) {
    const response = await fetchWithAuth(`${API_BASE}/documents/${documentId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ Comment: comment })
    });
    if (!response.ok) throw new Error('Failed to approve document');
    return response.json();
}

export async function rejectDocument(documentId, reason) {
    const response = await fetchWithAuth(`${API_BASE}/documents/${documentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ Reason: reason })
    });
    if (!response.ok) throw new Error('Failed to reject document');
    return response.json();
}

export async function createMilestoneDocument({ milestoneId, fileName, fileSize, documentType, notes }) {
    const response = await fetchWithAuth(`${API_BASE}/milestones/${milestoneId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
            FileName: fileName,
            FileSize: fileSize,
            DocumentType: documentType,
            Notes: notes
        })
    });
    
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function uploadDocument(formData) {
    const tokens = getTokens();
    const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
        },
        body: formData // Don't set Content-Type, let browser set it with boundary
    });
    
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function createProject(data) {
    const response = await fetchWithAuth(`${API_BASE}/projects`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateProject(projectId, data) {
    const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

// Documents
export async function getUploadUrl({ requirementId, fileName, contentType, size, md5 }) {
    const response = await fetchWithAuth(`${API_BASE}/requirements/${requirementId}/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType, size, md5 })
    });

    if (!response.ok) throw new Error('Failed to get upload URL');
    return response.json();
}

export async function confirmUpload({ requirementId, key, fileName, size, checksum }) {
    const response = await fetchWithAuth(`${API_BASE}/documents/confirm`, {
        method: 'POST',
        body: JSON.stringify({ requirementId, key, fileName, size, checksum })
    });

    if (!response.ok) throw new Error('Failed to confirm upload');
    return response.json();
}


// Entities
export async function fetchSkills() {
    const response = await fetchWithAuth(`${API_BASE}/entities/skills`);
    if (!response.ok) throw new Error('Failed to fetch skills');
    return response.json();
}

export async function createSkill(data) {
    const response = await fetchWithAuth(`${API_BASE}/entities/skills`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateSkill({ skillId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/entities/skills/${skillId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update skill');
    return response.json();
}

export async function fetchProjectTypes() {
    const response = await fetchWithAuth(`${API_BASE}/entities/project-types`);
    if (!response.ok) throw new Error('Failed to fetch project types');
    return response.json();
}

export async function createProjectType(data) {
    const response = await fetchWithAuth(`${API_BASE}/entities/project-types`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function fetchTemplates() {
    const response = await fetchWithAuth(`${API_BASE}/entities/templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
}

// Automations
export async function listAutomations() {
    const response = await fetchWithAuth(`${API_BASE}/automations`);
    if (!response.ok) throw new Error('Failed to fetch automations');
    const data = await response.json();
    return { rules: data };
}

export async function saveAutomation({ rule }) {
    const response = await fetchWithAuth(`${API_BASE}/automations`, {
        method: 'POST',
        body: JSON.stringify(rule)
    });

    if (!response.ok) throw new Error('Failed to save automation');
    return response.json();
}

export async function testAutomation({ ruleId, payload }) {
    const response = await fetchWithAuth(`${API_BASE}/automations/${ruleId}/test`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to test automation');
    return response.json();
}

// Users
export async function fetchUsers() {
    const response = await fetchWithAuth(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

export async function createUser(data) {
    const response = await fetchWithAuth(`${API_BASE}/users`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateUser({ userId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
}

export async function fetchMyAssignments() {
    const response = await fetchWithAuth(`${API_BASE}/users/me/assignments`);
    if (!response.ok) throw new Error('Failed to fetch assignments');
    return response.json();
}

// Notifications
export async function fetchNotifications({ unreadOnly = false } = {}) {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    
    const response = await fetchWithAuth(`${API_BASE}/notifications?${params}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
}

export async function markNotificationAsRead({ notificationId }) {
    const response = await fetchWithAuth(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH'
    });

    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
}

export async function markAllNotificationsAsRead() {
    const response = await fetchWithAuth(`${API_BASE}/notifications/mark-all-read`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return response.json();
}

// Milestones
export async function updateMilestone({ milestoneId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to update milestone');
    return response.json();
}

// Timeline
export async function addTimelineEvent({ projectId, milestoneId, message }) {
    const response = await fetchWithAuth(`${API_BASE}/timeline`, {
        method: 'POST',
        body: JSON.stringify({ projectId, milestoneId, message })
    });

    if (!response.ok) throw new Error('Failed to add timeline event');
    return response.json();
}

// Milestone Updates
export async function addMilestoneUpdate({ milestoneId, comment, newStatus, documentId }) {
    const response = await fetchWithAuth(`${API_BASE}/milestones/${milestoneId}/updates`, {
        method: 'POST',
        body: JSON.stringify({ comment, newStatus, documentId })
    });

    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

// Analytics
export async function fetchAnalyticsSummary() {
    const response = await fetchWithAuth(`${API_BASE}/analytics/summary`);

    if (!response.ok) {
        const message = await getErrorMessage(response);
        throw new Error(message);
    }

    return response.json();
}

export async function addCustomMilestone({ projectId, name, milestoneTypeId, dueOffsetDays, absoluteDueDate }) {
    const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ name, milestoneTypeId, dueOffsetDays, absoluteDueDate })
    });

    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function fetchMilestoneTypes() {
    const response = await fetchWithAuth(`${API_BASE}/entities/milestone-types`);
    if (!response.ok) throw new Error('Failed to fetch milestone types');
    return response.json();
}

export async function createMilestoneType(data) {
    const response = await fetchWithAuth(`${API_BASE}/entities/milestone-types`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateMilestoneType({ typeId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/entities/milestone-types/${typeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function deleteMilestoneType(typeId) {
    const response = await fetchWithAuth(`${API_BASE}/entities/milestone-types/${typeId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.ok;
}

export async function updateProjectType({ typeId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/entities/project-types/${typeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function createTemplate(data) {
    const response = await fetchWithAuth(`${API_BASE}/entities/templates`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function fetchDocumentTypes() {
    const response = await fetchWithAuth(`${API_BASE}/entities/document-types`);
    if (!response.ok) throw new Error('Failed to fetch document types');
    return response.json();
}

export async function createDocumentType(data) {
    const response = await fetchWithAuth(`${API_BASE}/entities/document-types`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateDocumentType({ typeId, data }) {
    const response = await fetchWithAuth(`${API_BASE}/entities/document-types/${typeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        throw new Error(errorMsg);
    }
    return response.json();
}
