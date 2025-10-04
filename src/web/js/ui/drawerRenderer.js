export function renderDrawer(project, milestone) {
    if (!project || !milestone) {
        return '<div class="loading">Loading...</div>';
    }

    const requirements = milestone.documentRequirements || [];
    const checklist = milestone.checklistItems || [];
    const timeline = project.timeline?.slice(0, 5) || [];

    return `
        <div class="drawer-section">
            <h4>Milestone: ${milestone.name}</h4>
            <div class="milestone-meta">
                <div class="meta-item">
                    <span class="meta-label">Status:</span>
                    <span class="status-badge status-${milestone.status.toLowerCase()}">${milestone.status}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Due Date:</span>
                    <span>${new Date(milestone.dueDate).toLocaleDateString()}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Assigned:</span>
                    <span>${milestone.assignedUserIds?.length || 0} users</span>
                </div>
            </div>
        </div>

        <div class="drawer-section">
            <h4>Document Requirements</h4>
            ${requirements.length === 0 ? '<p class="text-muted">No requirements</p>' : ''}
            <div class="requirements-list">
                ${requirements.map(req => `
                    <div class="requirement-item">
                        <div class="requirement-header">
                            <span class="requirement-name">${req.documentType.name}</span>
                            <span class="requirement-state state-${req.state.toLowerCase()}">${req.state}</span>
                        </div>
                        ${req.required ? '<span class="badge-required">Required</span>' : ''}
                        ${req.currentDocument ? `
                            <div class="document-info">
                                <span class="document-name">${req.currentDocument.fileName}</span>
                                <span class="document-version">v${req.currentDocument.version}</span>
                            </div>
                        ` : ''}
                        <div class="requirement-actions">
                            ${req.state === 'NotProvided' || req.state === 'Rejected' ? `
                                <button class="btn btn-sm" onclick="window.handleUpload('${req.id}')">Upload</button>
                            ` : ''}
                            ${req.state === 'PendingReview' ? `
                                <button class="btn btn-sm btn-success" onclick="window.handleApprove('${req.currentDocument.id}')">Approve</button>
                                <button class="btn btn-sm btn-danger" onclick="window.handleReject('${req.currentDocument.id}')">Reject</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="drawer-section">
            <h4>Checklist</h4>
            ${checklist.length === 0 ? '<p class="text-muted">No checklist items</p>' : ''}
            <div class="checklist">
                ${checklist.map(item => `
                    <div class="checklist-item">
                        <input type="checkbox" ${item.done ? 'checked' : ''} 
                               onchange="window.handleChecklistToggle('${item.id}', this.checked)">
                        <span class="${item.done ? 'checked' : ''}">${item.text}</span>
                        ${item.required ? '<span class="badge-required">Required</span>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="drawer-section">
            <h4>Recent Activity</h4>
            ${timeline.length === 0 ? '<p class="text-muted">No recent activity</p>' : ''}
            <div class="timeline">
                ${timeline.map(event => `
                    <div class="timeline-event">
                        <div class="timeline-icon">${getTimelineIcon(event.type)}</div>
                        <div class="timeline-content">
                            <div class="timeline-message">${event.message}</div>
                            <div class="timeline-meta">
                                <span class="timeline-author">${event.createdBy}</span>
                                <span class="timeline-time">${formatTimeAgo(event.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="drawer-section">
            <h4>Add Comment</h4>
            <form onsubmit="window.handleAddComment(event, '${project.id}', '${milestone.id}')">
                <textarea class="form-control" placeholder="Add a comment..." rows="3" required></textarea>
                <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Post Comment</button>
            </form>
        </div>
    `;
}

function getTimelineIcon(type) {
    const icons = {
        'ProjectCreated': '🎉',
        'MilestoneCreated': '📌',
        'MilestoneStatusChanged': '🔄',
        'DocumentUploaded': '📤',
        'DocumentApproved': '✅',
        'DocumentRejected': '❌',
        'Comment': '💬',
        'AssignmentChanged': '👤',
        'DueDateChanged': '📅'
    };
    return icons[type] || '•';
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}
