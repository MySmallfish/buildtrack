import { fetchMyAssignments } from '../services/api.js';

export async function renderContributorPortal(container) {
    container.innerHTML = `
        <div class="contributor-portal">
            <div class="portal-header">
                <h1>My Assignments</h1>
                <p class="text-muted">Tasks and documents assigned to you</p>
            </div>
            <div id="assignments-list" class="loading">
                <p>Loading your assignments...</p>
            </div>
        </div>
    `;

    await loadAssignments();
}

async function loadAssignments() {
    const listContainer = document.getElementById('assignments-list');
    
    try {
        const assignments = await fetchMyAssignments();
        
        if (assignments.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No assignments yet</h3>
                <p>You don't have any milestones assigned to you</p>
            `;
            return;
        }

        listContainer.className = 'assignments-grid';
        listContainer.innerHTML = assignments.map(assignment => renderAssignment(assignment)).join('');

        // Attach event listeners
        assignments.forEach(assignment => {
            const card = document.querySelector(`[data-milestone-id="${assignment.milestoneId}"]`);
            if (card) {
                card.addEventListener('click', () => {
                    showAssignmentDetails(assignment);
                });
            }
        });
    } catch (error) {
        console.error('Error loading assignments:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load assignments</h3>
            <p>${error.message}</p>
        `;
    }
}

function renderAssignment(assignment) {
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = dueDate < new Date() && assignment.status !== 'Completed';
    const dueDateClass = isOverdue ? 'overdue' : '';
    
    const pendingRequirements = assignment.requirements.filter(r => 
        r.state === 'NotProvided' || r.state === 'Rejected'
    );
    
    const statusClass = `status-${assignment.status.toLowerCase()}`;

    return `
        <div class="assignment-card" data-milestone-id="${assignment.milestoneId}">
            <div class="assignment-header">
                <div>
                    <h3>${escapeHtml(assignment.milestoneName)}</h3>
                    <p class="assignment-project">
                        <span class="project-code">${escapeHtml(assignment.projectCode)}</span>
                        ${escapeHtml(assignment.projectName)}
                    </p>
                </div>
                <span class="status-badge ${statusClass}">${assignment.status}</span>
            </div>
            
            <div class="assignment-body">
                <div class="assignment-info">
                    <span class="info-label">Due Date:</span>
                    <span class="${dueDateClass}">${dueDate.toLocaleDateString()}</span>
                </div>
                
                <div class="assignment-requirements">
                    <h4>Requirements (${assignment.requirements.length})</h4>
                    <div class="requirements-summary">
                        ${assignment.requirements.map(req => `
                            <div class="requirement-badge ${req.state.toLowerCase()}">
                                <span class="req-icon">${getRequirementIcon(req.state)}</span>
                                <span>${escapeHtml(req.documentType)}</span>
                                ${req.required ? '<span class="req-required">*</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${pendingRequirements.length > 0 ? `
                    <div class="assignment-alert">
                        <span>⚠️</span>
                        <span>${pendingRequirements.length} document(s) need your attention</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="assignment-footer">
                <button class="btn btn-primary btn-sm" onclick="window.openAssignmentDetails('${assignment.milestoneId}')">
                    View Details
                </button>
            </div>
        </div>
    `;
}

function getRequirementIcon(state) {
    const icons = {
        'NotProvided': '⭕',
        'PendingReview': '⏳',
        'Approved': '✅',
        'Rejected': '❌'
    };
    return icons[state] || '⭕';
}

function showAssignmentDetails(assignment) {
    // Navigate to project details with milestone focus
    window.location.hash = `#/projects/${assignment.projectId}?milestone=${assignment.milestoneId}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for global access
window.openAssignmentDetails = (milestoneId) => {
    const assignments = window.currentAssignments || [];
    const assignment = assignments.find(a => a.milestoneId === milestoneId);
    if (assignment) {
        showAssignmentDetails(assignment);
    }
};
