import { updateMilestone, fetchUsers } from '../services/api.js';

export async function showMilestoneDetailsModal(milestone, project) {
    const users = await fetchUsers();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'milestone-details-modal';
    
    const isOverdue = milestone.status !== 'Completed' && new Date(milestone.dueDate) < new Date();
    const daysUntilDue = Math.ceil((new Date(milestone.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    const progressPercent = milestone.requirementsTotal > 0 
        ? Math.round((milestone.requirementsCompleted / milestone.requirementsTotal) * 100) 
        : 0;
    
    modal.innerHTML = `
        <div class="modal modal-xlarge">
            <div class="modal-header">
                <div class="modal-title-section">
                    <h3>${escapeHtml(milestone.name)}</h3>
                    <span class="status-badge status-${milestone.status.toLowerCase()}">${milestone.status}</span>
                </div>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body milestone-details-body">
                <div class="milestone-details-grid">
                    <!-- Left Column: Details -->
                    <div class="milestone-details-main">
                        <div class="detail-section">
                            <h4>Milestone Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Type:</span>
                                    <span>${escapeHtml(milestone.type)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Due Date:</span>
                                    <span>
                                        ${new Date(milestone.dueDate).toLocaleDateString()}
                                        ${isOverdue ? '<span class="text-danger"> (Overdue)</span>' : 
                                          daysUntilDue >= 0 && daysUntilDue <= 7 ? `<span class="text-warning"> (${daysUntilDue} days left)</span>` : ''}
                                    </span>
                                </div>
                                ${milestone.completedAt ? `
                                    <div class="info-item">
                                        <span class="info-label">Completed:</span>
                                        <span>${new Date(milestone.completedAt).toLocaleDateString()}</span>
                                    </div>
                                ` : ''}
                                <div class="info-item">
                                    <span class="info-label">Project:</span>
                                    <span>${escapeHtml(project.name)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Document Requirements</h4>
                            <div class="progress-section">
                                <div class="progress-bar-large">
                                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                                </div>
                                <p class="progress-text">${milestone.requirementsCompleted} of ${milestone.requirementsTotal} requirements completed (${progressPercent}%)</p>
                            </div>
                            ${milestone.requirementsTotal === 0 ? 
                                '<p class="text-muted">No document requirements for this milestone</p>' : 
                                '<p class="text-muted">View full document requirements in the Documents tab</p>'}
                        </div>

                        <div class="detail-section">
                            <h4>Assigned Team Members</h4>
                            <div class="assigned-users-list" id="assigned-users-list">
                                ${milestone.assignedUserIds && milestone.assignedUserIds.length > 0 ? 
                                    milestone.assignedUserIds.map(userId => {
                                        const user = users.find(u => u.id === userId);
                                        return user ? `
                                            <div class="assigned-user-item">
                                                <span class="user-avatar">${user.fullName[0].toUpperCase()}</span>
                                                <span>${escapeHtml(user.fullName)}</span>
                                                <span class="user-role">${user.role}</span>
                                            </div>
                                        ` : '';
                                    }).join('') : 
                                    '<p class="text-muted">No team members assigned</p>'}
                            </div>
                            <button class="btn btn-sm" id="edit-assignments-btn">Edit Assignments</button>
                        </div>

                        ${milestone.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="milestone-notes">${escapeHtml(milestone.notes)}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Column: Actions & Status -->
                    <div class="milestone-details-sidebar">
                        <div class="detail-section">
                            <h4>Quick Actions</h4>
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-block" id="add-update-btn">
                                    <span>📝</span> Add Update
                                </button>
                                <button class="btn btn-block" id="change-due-date-btn">
                                    <span>📅</span> Change Due Date
                                </button>
                                <button class="btn btn-block" id="change-status-btn">
                                    <span>🔄</span> Change Status
                                </button>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Flags & Indicators</h4>
                            <div class="flags-list">
                                <label class="flag-item">
                                    <input type="checkbox" id="blocked-flag" ${milestone.blockedFlag ? 'checked' : ''}>
                                    <span>🚫 Blocked</span>
                                </label>
                                <label class="flag-item">
                                    <input type="checkbox" id="failed-check-flag" ${milestone.failedCheckFlag ? 'checked' : ''}>
                                    <span>❌ Failed Check</span>
                                </label>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Status History</h4>
                            <div class="status-history">
                                ${getStatusHistory(milestone, project)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" id="close-btn">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('close-btn').addEventListener('click', closeModal);

    // Add Update button
    document.getElementById('add-update-btn').addEventListener('click', async () => {
        closeModal();
        const { showMilestoneUpdateModal } = await import('./milestoneUpdateModal.js');
        await showMilestoneUpdateModal(milestone, project.id);
    });

    // Change Due Date button
    document.getElementById('change-due-date-btn').addEventListener('click', () => {
        showChangeDueDateModal(milestone, project, closeModal);
    });

    // Change Status button
    document.getElementById('change-status-btn').addEventListener('click', () => {
        showChangeStatusModal(milestone, project, closeModal);
    });

    // Edit Assignments button
    document.getElementById('edit-assignments-btn').addEventListener('click', () => {
        showEditAssignmentsModal(milestone, project, users, closeModal);
    });

    // Blocked flag
    document.getElementById('blocked-flag').addEventListener('change', async (e) => {
        try {
            await updateMilestone({
                milestoneId: milestone.id,
                data: { blockedFlag: e.target.checked }
            });
            showToast(e.target.checked ? 'Milestone marked as blocked' : 'Milestone unblocked', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showToast('Failed to update flag: ' + error.message, 'error');
            e.target.checked = !e.target.checked;
        }
    });

    // Failed check flag
    document.getElementById('failed-check-flag').addEventListener('change', async (e) => {
        try {
            await updateMilestone({
                milestoneId: milestone.id,
                data: { failedCheckFlag: e.target.checked }
            });
            showToast(e.target.checked ? 'Milestone marked as failed check' : 'Failed check cleared', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showToast('Failed to update flag: ' + error.message, 'error');
            e.target.checked = !e.target.checked;
        }
    });
}

function getStatusHistory(milestone, project) {
    // Get timeline events related to this milestone
    const milestoneEvents = project.timeline?.filter(e => 
        e.message.toLowerCase().includes(milestone.name.toLowerCase()) ||
        e.type === 'MilestoneStatusChanged'
    ) || [];

    if (milestoneEvents.length === 0) {
        return '<p class="text-muted">No status changes recorded</p>';
    }

    return milestoneEvents.slice(0, 5).map(event => `
        <div class="status-history-item">
            <div class="status-history-icon">${getEventIcon(event.type)}</div>
            <div class="status-history-content">
                <p>${escapeHtml(event.message)}</p>
                <span class="text-muted">${formatRelativeTime(event.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function showChangeDueDateModal(milestone, project, parentCloseModal) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Change Due Date</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="change-due-date-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-due-date">New Due Date *</label>
                        <input type="date" id="new-due-date" class="form-control" required
                            value="${new Date(milestone.dueDate).toISOString().split('T')[0]}">
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Due Date</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => document.body.removeChild(modal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('change-due-date-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDate = document.getElementById('new-due-date').value;
        
        try {
            await updateMilestone({
                milestoneId: milestone.id,
                data: { dueDate: newDate }
            });
            closeModal();
            showToast('Due date updated successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            document.getElementById('form-error').textContent = error.message;
            document.getElementById('form-error').style.display = 'block';
        }
    });
}

function showChangeStatusModal(milestone, project, parentCloseModal) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Change Status</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="change-status-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-status">New Status *</label>
                        <select id="new-status" class="form-control" required>
                            <option value="NotStarted" ${milestone.status === 'NotStarted' ? 'selected' : ''}>Not Started</option>
                            <option value="InProgress" ${milestone.status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                            <option value="PendingReview" ${milestone.status === 'PendingReview' ? 'selected' : ''}>Pending Review</option>
                            <option value="Completed" ${milestone.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Blocked" ${milestone.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="status-notes">Notes (Optional)</label>
                        <textarea id="status-notes" class="form-control" rows="3" 
                            placeholder="Add any notes about this status change..."></textarea>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Status</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => document.body.removeChild(modal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('change-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = document.getElementById('new-status').value;
        const notes = document.getElementById('status-notes').value;
        
        try {
            await updateMilestone({
                milestoneId: milestone.id,
                data: { 
                    status: newStatus,
                    notes: notes || undefined
                }
            });
            closeModal();
            showToast('Status updated successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            document.getElementById('form-error').textContent = error.message;
            document.getElementById('form-error').style.display = 'block';
        }
    });
}

function showEditAssignmentsModal(milestone, project, users, parentCloseModal) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const currentAssignments = milestone.assignedUserIds || [];
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Assignments</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="edit-assignments-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Assign Team Members</label>
                        <div class="user-checkboxes">
                            ${users.map(user => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="assignedUsers" value="${user.id}"
                                        ${currentAssignments.includes(user.id) ? 'checked' : ''}>
                                    <span>${escapeHtml(user.fullName)} (${user.role})</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Assignments</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => document.body.removeChild(modal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('edit-assignments-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('input[name="assignedUsers"]:checked');
        const assignedUserIds = Array.from(checkboxes).map(cb => cb.value);
        
        try {
            await updateMilestone({
                milestoneId: milestone.id,
                data: { assignedUserIds }
            });
            closeModal();
            showToast('Assignments updated successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            document.getElementById('form-error').textContent = error.message;
            document.getElementById('form-error').style.display = 'block';
        }
    });
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
