import { fetchProjectSummary, addTimelineEvent, updateMilestone } from '../services/api.js';

export async function renderProjectDetails(container, projectId) {
    container.innerHTML = `
        <div class="project-details">
            <div class="project-header">
                <button class="btn-icon back-btn" id="back-btn">
                    <span>←</span>
                </button>
                <div class="project-title">
                    <h1 id="project-name">Loading...</h1>
                    <p id="project-code" class="text-muted"></p>
                </div>
                <div class="project-actions">
                    <button class="btn" id="edit-project-btn">Edit Project</button>
                    <button class="btn" id="add-milestone-btn">+ Add Milestone</button>
                    <button class="btn btn-primary" id="add-comment-btn">+ Comment</button>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-btn active" data-tab="overview">Overview</button>
                <button class="tab-btn" data-tab="milestones">Milestones</button>
                <button class="tab-btn" data-tab="timeline">Timeline</button>
                <button class="tab-btn" data-tab="documents">Documents</button>
            </div>

            <div class="tab-content" id="tab-content">
                <div class="loading"><p>Loading project details...</p></div>
            </div>
        </div>
    `;

    // Setup navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
        window.location.hash = '#/';
    });

    // Setup edit project button
    document.getElementById('edit-project-btn')?.addEventListener('click', async () => {
        if (window.currentProject) {
            const { showEditProjectModal } = await import('../components/editProjectModal.js');
            await showEditProjectModal(window.currentProject);
        }
    });

    // Setup add milestone button
    document.getElementById('add-milestone-btn')?.addEventListener('click', async () => {
        if (window.currentProject) {
            const { showAddMilestoneModal } = await import('../components/addMilestoneModal.js');
            await showAddMilestoneModal(window.currentProject);
        }
    });

    // Setup add comment button
    document.getElementById('add-comment-btn')?.addEventListener('click', () => {
        if (window.currentProject) {
            showAddCommentModal(window.currentProject.id);
        }
    });

    // Setup tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            renderTab(tab, projectId);
        });
    });

    // Load project data
    await loadProjectData(projectId);
}

async function loadProjectData(projectId) {
    try {
        const data = await fetchProjectSummary({ projectId });
        
        // Update header
        document.getElementById('project-name').textContent = data.project.name;
        document.getElementById('project-code').textContent = data.project.code;

        // Store data for tabs
        window.currentProject = data.project;
        window.currentProjectId = projectId;

        // Render initial tab
        renderTab('overview', projectId);
    } catch (error) {
        console.error('Error loading project:', error);
        document.getElementById('tab-content').innerHTML = `
            <div class="empty-state">
                <h3>Unable to load project</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderTab(tab, projectId) {
    const content = document.getElementById('tab-content');
    const project = window.currentProject;

    if (!project) {
        content.innerHTML = '<div class="loading"><p>Loading...</p></div>';
        return;
    }

    switch (tab) {
        case 'overview':
            renderOverviewTab(content, project);
            break;
        case 'milestones':
            renderMilestonesTab(content, project);
            break;
        case 'timeline':
            renderTimelineTab(content, project);
            break;
        case 'documents':
            renderDocumentsTab(content, project);
            break;
    }
}

function renderOverviewTab(container, project) {
    const completedCount = project.milestones?.filter(m => m.status === 'Completed').length || 0;
    const totalCount = project.milestones?.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const inProgressCount = project.milestones?.filter(m => m.status === 'InProgress').length || 0;
    const blockedCount = project.milestones?.filter(m => m.blockedFlag).length || 0;
    const overdueCount = project.milestones?.filter(m => {
        return m.status !== 'Completed' && new Date(m.dueDate) < new Date();
    }).length || 0;

    container.innerHTML = `
        <div class="overview-grid">
            <div class="overview-card">
                <h3>Project Information</h3>
                <div class="info-list">
                    <div class="info-item">
                        <span class="info-label">Type:</span>
                        <span>${escapeHtml(project.projectType?.name || 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Owner:</span>
                        <span>${escapeHtml(project.owner?.name || 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Start Date:</span>
                        <span>${new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="status-badge status-${project.status.toLowerCase()}">${project.status}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Location:</span>
                        <span>${escapeHtml(project.location || 'N/A')}</span>
                    </div>
                    ${project.tags && project.tags.length > 0 ? `
                        <div class="info-item">
                            <span class="info-label">Tags:</span>
                            <span>${project.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="overview-card">
                <h3>Progress</h3>
                <div class="progress-large">
                    <div class="progress-circle">
                        <span class="progress-percent">${progressPercent}%</span>
                    </div>
                    <p class="progress-label">${completedCount} of ${totalCount} milestones completed</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${inProgressCount}</span>
                        <span class="stat-label">In Progress</span>
                    </div>
                    <div class="stat-item ${overdueCount > 0 ? 'stat-warning' : ''}">
                        <span class="stat-value">${overdueCount}</span>
                        <span class="stat-label">Overdue</span>
                    </div>
                    <div class="stat-item ${blockedCount > 0 ? 'stat-danger' : ''}">
                        <span class="stat-value">${blockedCount}</span>
                        <span class="stat-label">Blocked</span>
                    </div>
                </div>
            </div>

            <div class="overview-card">
                <h3>Stakeholders</h3>
                <div class="stakeholder-list">
                    ${project.stakeholderEmails?.map(email => `
                        <div class="stakeholder-item">
                            <span class="stakeholder-avatar">${email[0].toUpperCase()}</span>
                            <span>${escapeHtml(email)}</span>
                        </div>
                    `).join('') || '<p class="text-muted">No stakeholders</p>'}
                </div>
            </div>

            <div class="overview-card full-width">
                <h3>Recent Activity</h3>
                <div class="timeline-compact">
                    ${project.timeline?.slice(0, 5).map(event => `
                        <div class="timeline-item-compact">
                            <span class="timeline-icon">${getEventIcon(event.type)}</span>
                            <div class="timeline-content-compact">
                                <p>${escapeHtml(event.message)}</p>
                                <span class="text-muted">${escapeHtml(event.createdBy)} • ${formatRelativeTime(event.createdAt)}</span>
                            </div>
                        </div>
                    `).join('') || '<p class="text-muted">No activity yet</p>'}
                </div>
                ${project.timeline && project.timeline.length > 5 ? `
                    <button class="btn btn-sm" onclick="document.querySelector('[data-tab=\"timeline\"]').click()">View All Activity</button>
                ` : ''}
            </div>
        </div>
    `;
}

function renderMilestonesTab(container, project) {
    const milestones = project.milestones || [];
    
    // Sort milestones by due date
    const sortedMilestones = [...milestones].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    container.innerHTML = `
        <div class="milestones-container">
            <div class="milestones-header">
                <h3>Milestones (${milestones.length})</h3>
                <button class="btn btn-primary" id="add-milestone-btn-tab">+ Add Milestone</button>
            </div>
            <div class="milestones-list">
                ${milestones.length === 0 ? '<p class="text-muted">No milestones yet. Click "+ Add Milestone" to create one.</p>' : ''}
                ${sortedMilestones.map(milestone => {
                    const isOverdue = milestone.status !== 'Completed' && new Date(milestone.dueDate) < new Date();
                    const daysUntilDue = Math.ceil((new Date(milestone.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return `
                    <div class="milestone-card ${isOverdue ? 'milestone-overdue' : ''}" data-milestone-id="${milestone.id}">
                        <div class="milestone-header">
                            <div class="milestone-title-section">
                                <h4>${escapeHtml(milestone.name)}</h4>
                                <span class="milestone-type">${escapeHtml(milestone.type)}</span>
                            </div>
                            <span class="status-badge status-${milestone.status.toLowerCase()}">${milestone.status}</span>
                        </div>
                        <div class="milestone-body">
                            <div class="milestone-info-grid">
                                <div class="milestone-info">
                                    <span class="info-label">📅 Due Date:</span>
                                    <span>${new Date(milestone.dueDate).toLocaleDateString()}
                                        ${isOverdue ? '<span class="text-danger"> (Overdue)</span>' : 
                                          daysUntilDue >= 0 && daysUntilDue <= 7 ? `<span class="text-warning"> (${daysUntilDue}d left)</span>` : ''}
                                    </span>
                                </div>
                                <div class="milestone-info">
                                    <span class="info-label">📋 Requirements:</span>
                                    <span>${milestone.requirementsCompleted}/${milestone.requirementsTotal} completed</span>
                                </div>
                                ${milestone.completedAt ? `
                                    <div class="milestone-info">
                                        <span class="info-label">✅ Completed:</span>
                                        <span>${new Date(milestone.completedAt).toLocaleDateString()}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="milestone-badges">
                                ${milestone.blockedFlag ? '<span class="badge badge-warning">🚫 Blocked</span>' : ''}
                                ${milestone.failedCheckFlag ? '<span class="badge badge-danger">❌ Failed Check</span>' : ''}
                                ${milestone.assignedUserIds && milestone.assignedUserIds.length > 0 ? 
                                    `<span class="badge badge-info">👥 ${milestone.assignedUserIds.length} assigned</span>` : ''}
                            </div>
                        </div>
                        <div class="milestone-actions">
                            <button class="btn btn-sm btn-primary" onclick="window.addMilestoneUpdate('${milestone.id}', '${escapeHtml(milestone.name).replace(/'/g, "\\'")}', '${milestone.status}')">+ Add Update</button>
                            <button class="btn btn-sm" onclick="window.viewMilestoneDetails('${milestone.id}')">View Details</button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `;
    
    // Add event listener for the add milestone button in the tab
    document.getElementById('add-milestone-btn-tab')?.addEventListener('click', async () => {
        if (window.currentProject) {
            const { showAddMilestoneModal } = await import('../components/addMilestoneModal.js');
            await showAddMilestoneModal(window.currentProject);
        }
    });
}

function renderTimelineTab(container, project) {
    const timeline = project.timeline || [];
    
    // Group timeline events by date
    const groupedTimeline = groupTimelineByDate(timeline);

    container.innerHTML = `
        <div class="timeline-view">
            <div class="timeline-header">
                <div class="timeline-title">
                    <h3>Full Project Timeline</h3>
                    <p class="text-muted">${timeline.length} events</p>
                </div>
                <div class="timeline-actions">
                    <select id="timeline-filter" class="form-control form-control-sm">
                        <option value="all">All Events</option>
                        <option value="Comment">Comments</option>
                        <option value="MilestoneStatusChanged">Milestone Changes</option>
                        <option value="DocumentUploaded">Documents</option>
                        <option value="DueDateChanged">Due Date Changes</option>
                    </select>
                    <button class="btn btn-primary" id="add-timeline-event">+ Add Comment</button>
                </div>
            </div>
            <div class="timeline" id="timeline-container">
                ${timeline.length === 0 ? '<div class="empty-state"><p class="text-muted">No timeline events yet</p></div>' : ''}
                ${Object.entries(groupedTimeline).map(([date, events]) => `
                    <div class="timeline-date-group">
                        <div class="timeline-date-header">${date}</div>
                        ${events.map(event => `
                            <div class="timeline-event" data-event-type="${event.type}">
                                <div class="timeline-icon ${getEventClass(event.type)}">
                                    ${getEventIcon(event.type)}
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-message">${escapeHtml(event.message)}</div>
                                    <div class="timeline-meta">
                                        <span class="timeline-author">${escapeHtml(event.createdBy)}</span>
                                        <span>•</span>
                                        <span class="timeline-time">${formatTime(event.createdAt)}</span>
                                        <span class="timeline-type-badge">${getEventTypeName(event.type)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('add-timeline-event')?.addEventListener('click', () => {
        showAddCommentModal(project.id);
    });
    
    // Add filter functionality
    document.getElementById('timeline-filter')?.addEventListener('change', (e) => {
        const filterValue = e.target.value;
        const events = document.querySelectorAll('.timeline-event');
        
        events.forEach(event => {
            if (filterValue === 'all' || event.dataset.eventType === filterValue) {
                event.style.display = '';
            } else {
                event.style.display = 'none';
            }
        });
        
        // Hide empty date groups
        document.querySelectorAll('.timeline-date-group').forEach(group => {
            const visibleEvents = group.querySelectorAll('.timeline-event:not([style*="display: none"])');
            group.style.display = visibleEvents.length > 0 ? '' : 'none';
        });
    });
}

function renderDocumentsTab(container, project) {
    const milestones = project.milestones || [];
    
    // Calculate document statistics
    const totalRequirements = milestones.reduce((sum, m) => sum + m.requirementsTotal, 0);
    const completedRequirements = milestones.reduce((sum, m) => sum + m.requirementsCompleted, 0);
    const pendingRequirements = totalRequirements - completedRequirements;
    
    container.innerHTML = `
        <div class="documents-view">
            <div class="documents-header">
                <div class="documents-stats">
                    <div class="stat-card">
                        <span class="stat-value">${totalRequirements}</span>
                        <span class="stat-label">Total Requirements</span>
                    </div>
                    <div class="stat-card stat-success">
                        <span class="stat-value">${completedRequirements}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat-card stat-warning">
                        <span class="stat-value">${pendingRequirements}</span>
                        <span class="stat-label">Pending</span>
                    </div>
                </div>
            </div>
            
            <div class="documents-by-milestone">
                <h3>Documents by Milestone</h3>
                ${milestones.length === 0 ? '<p class="text-muted">No milestones with document requirements</p>' : ''}
                ${milestones.map(milestone => {
                    if (milestone.requirementsTotal === 0) return '';
                    
                    const progressPercent = milestone.requirementsTotal > 0 
                        ? Math.round((milestone.requirementsCompleted / milestone.requirementsTotal) * 100) 
                        : 0;
                    
                    return `
                        <div class="milestone-documents-card">
                            <div class="milestone-documents-header">
                                <div class="milestone-info-section">
                                    <h4>${escapeHtml(milestone.name)}</h4>
                                    <span class="milestone-type-badge">${escapeHtml(milestone.type)}</span>
                                </div>
                                <span class="status-badge status-${milestone.status.toLowerCase()}">${milestone.status}</span>
                            </div>
                            <div class="milestone-documents-body">
                                <div class="document-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                                    </div>
                                    <span class="progress-text">${milestone.requirementsCompleted} of ${milestone.requirementsTotal} requirements completed</span>
                                </div>
                                <div class="document-actions">
                                    <button class="btn btn-sm btn-primary" onclick="window.uploadDocument('${milestone.id}')">
                                        📤 Upload Document
                                    </button>
                                    <button class="btn btn-sm" onclick="window.viewMilestoneDetails('${milestone.id}')">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="documents-info-section">
                <h3>Document Management</h3>
                <p class="text-muted">
                    Documents are organized by milestone requirements. Each milestone may have specific document types that need to be submitted and approved.
                </p>
                <ul class="info-list">
                    <li>Upload documents directly to milestone requirements</li>
                    <li>Track approval status for each document</li>
                    <li>View document history in the timeline</li>
                    <li>Receive notifications when documents are approved or rejected</li>
                </ul>
            </div>
        </div>
    `;
}

function getEventIcon(type) {
    const icons = {
        'ProjectCreated': '🎉',
        'MilestoneStatusChanged': '📊',
        'DocumentUploaded': '📄',
        'DocumentApproved': '✅',
        'DocumentRejected': '❌',
        'DueDateChanged': '📅',
        'Comment': '💬'
    };
    return icons[type] || '•';
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function showAddCommentModal(projectId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add Comment</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <textarea id="comment-text" class="form-control" rows="4" placeholder="Enter your comment..."></textarea>
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancel-btn">Cancel</button>
                <button class="btn btn-primary" id="submit-comment">Add Comment</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    document.getElementById('submit-comment').addEventListener('click', async () => {
        const message = document.getElementById('comment-text').value.trim();
        if (!message) {
            showToast('Please enter a comment', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-comment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            await addTimelineEvent({ projectId, message });
            closeModal();
            showToast('Comment added successfully', 'success');
            // Reload project data and refresh current view
            const data = await fetchProjectSummary({ projectId });
            window.currentProject = data.project;
            // Get current active tab and re-render it
            const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'overview';
            renderTab(activeTab, projectId);
        } catch (error) {
            showToast('Failed to add comment: ' + error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Comment';
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper functions for timeline
function groupTimelineByDate(timeline) {
    const groups = {};
    
    timeline.forEach(event => {
        const date = new Date(event.createdAt);
        const dateKey = formatDateKey(date);
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(event);
    });
    
    return groups;
}

function formatDateKey(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getEventClass(type) {
    const classes = {
        'ProjectCreated': 'event-success',
        'MilestoneStatusChanged': 'event-info',
        'DocumentUploaded': 'event-primary',
        'DocumentApproved': 'event-success',
        'DocumentRejected': 'event-danger',
        'DueDateChanged': 'event-warning',
        'Comment': 'event-default'
    };
    return classes[type] || 'event-default';
}

function getEventTypeName(type) {
    const names = {
        'ProjectCreated': 'Project',
        'MilestoneStatusChanged': 'Milestone',
        'DocumentUploaded': 'Document',
        'DocumentApproved': 'Approval',
        'DocumentRejected': 'Rejection',
        'DueDateChanged': 'Schedule',
        'Comment': 'Comment'
    };
    return names[type] || type;
}

// Export for global access
window.viewMilestoneDetails = async (milestoneId) => {
    const milestone = window.currentProject?.milestones?.find(m => m.id === milestoneId);
    if (milestone) {
        const { showMilestoneDetailsModal } = await import('../components/milestoneDetailsModal.js');
        await showMilestoneDetailsModal(milestone, window.currentProject);
    }
};

window.addMilestoneUpdate = async (milestoneId, milestoneName, status) => {
    const { showMilestoneUpdateModal } = await import('../components/milestoneUpdateModal.js');
    const milestone = {
        id: milestoneId,
        name: milestoneName,
        status: status
    };
    await showMilestoneUpdateModal(milestone, window.currentProject?.id);
};

window.uploadDocument = async (milestoneId) => {
    const milestone = window.currentProject?.milestones?.find(m => m.id === milestoneId);
    if (milestone) {
        const { showMilestoneUpdateModal } = await import('../components/milestoneUpdateModal.js');
        await showMilestoneUpdateModal(milestone, window.currentProject?.id);
    }
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
