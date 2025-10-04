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

    // Setup add milestone button
    document.getElementById('add-milestone-btn')?.addEventListener('click', async () => {
        if (window.currentProject) {
            const { showAddMilestoneModal } = await import('../components/addMilestoneModal.js');
            await showAddMilestoneModal(window.currentProject);
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
                            <span class="timeline-icon">•</span>
                            <div class="timeline-content-compact">
                                <p>${escapeHtml(event.message)}</p>
                                <span class="text-muted">${escapeHtml(event.createdBy)} • ${formatRelativeTime(event.createdAt)}</span>
                            </div>
                        </div>
                    `).join('') || '<p class="text-muted">No activity yet</p>'}
                </div>
            </div>
        </div>
    `;
}

function renderMilestonesTab(container, project) {
    const milestones = project.milestones || [];

    container.innerHTML = `
        <div class="milestones-list">
            ${milestones.length === 0 ? '<p class="text-muted">No milestones</p>' : ''}
            ${milestones.map(milestone => `
                <div class="milestone-card" data-milestone-id="${milestone.id}">
                    <div class="milestone-header">
                        <h4>${escapeHtml(milestone.name)}</h4>
                        <span class="status-badge status-${milestone.status.toLowerCase()}">${milestone.status}</span>
                    </div>
                    <div class="milestone-body">
                        <div class="milestone-info">
                            <span class="info-label">Type:</span> ${escapeHtml(milestone.type)}
                        </div>
                        <div class="milestone-info">
                            <span class="info-label">Due Date:</span> ${new Date(milestone.dueDate).toLocaleDateString()}
                        </div>
                        <div class="milestone-info">
                            <span class="info-label">Requirements:</span> ${milestone.requirementsCompleted}/${milestone.requirementsTotal}
                        </div>
                        ${milestone.blockedFlag ? '<span class="badge badge-warning">Blocked</span>' : ''}
                        ${milestone.failedCheckFlag ? '<span class="badge badge-danger">Failed Check</span>' : ''}
                    </div>
                    <div class="milestone-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.addMilestoneUpdate('${milestone.id}', '${escapeHtml(milestone.name)}', '${milestone.status}')">+ Add Update</button>
                        <button class="btn btn-sm" onclick="window.viewMilestone('${milestone.id}')">View Details</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderTimelineTab(container, project) {
    const timeline = project.timeline || [];

    container.innerHTML = `
        <div class="timeline-view">
            <div class="timeline-header">
                <button class="btn btn-primary" id="add-timeline-event">+ Add Event</button>
            </div>
            <div class="timeline">
                ${timeline.length === 0 ? '<p class="text-muted">No timeline events</p>' : ''}
                ${timeline.map(event => `
                    <div class="timeline-event">
                        <div class="timeline-icon">
                            ${getEventIcon(event.type)}
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-message">${escapeHtml(event.message)}</div>
                            <div class="timeline-meta">
                                <span>${escapeHtml(event.createdBy)}</span>
                                <span>•</span>
                                <span>${formatRelativeTime(event.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('add-timeline-event')?.addEventListener('click', () => {
        showAddCommentModal(project.id);
    });
}

function renderDocumentsTab(container, project) {
    container.innerHTML = `
        <div class="documents-view">
            <p class="text-muted">Document management coming soon</p>
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
        if (!message) return;

        try {
            await addTimelineEvent({ projectId, message });
            closeModal();
            // Reload project data
            await loadProjectData(projectId);
        } catch (error) {
            alert('Failed to add comment: ' + error.message);
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for global access
window.viewMilestone = (milestoneId) => {
    alert(`Milestone details for ${milestoneId} - Coming soon`);
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
