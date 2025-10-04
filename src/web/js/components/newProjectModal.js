import { fetchProjectTypes, fetchTemplates, fetchUsers, createProject } from '../services/api.js';

export async function showNewProjectModal() {
    // Load data for dropdowns
    const [projectTypes, users] = await Promise.all([
        fetchProjectTypes(),
        fetchUsers()
    ]);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'new-project-modal';
    
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Create New Project</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="new-project-form">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="project-name">Project Name *</label>
                            <input type="text" id="project-name" name="name" class="form-control" required 
                                placeholder="e.g., Downtown Office Building">
                        </div>
                        <div class="form-group">
                            <label for="project-code">Project Code</label>
                            <input type="text" id="project-code" name="code" class="form-control" 
                                placeholder="Auto-generated if empty">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="project-type">Project Type *</label>
                            <select id="project-type" name="projectTypeId" class="form-control" required>
                                <option value="">Select project type...</option>
                                ${projectTypes.map(pt => `
                                    <option value="${pt.id}" data-template-id="${pt.templateId || ''}">${escapeHtml(pt.name)}</option>
                                `).join('')}
                            </select>
                            <div id="milestone-preview" style="display: none; margin-top: 12px;">
                                <small class="text-muted">This will create the following milestones:</small>
                                <div id="milestone-preview-list"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="project-owner">Project Owner *</label>
                            <select id="project-owner" name="ownerUserId" class="form-control" required>
                                <option value="">Select owner...</option>
                                ${users.filter(u => u.role === 'Admin' || u.role === 'ProjectManager').map(u => `
                                    <option value="${u.id}">${escapeHtml(u.fullName)}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="start-date">Start Date *</label>
                            <input type="date" id="start-date" name="startDate" class="form-control" required 
                                value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label for="location">Location</label>
                            <input type="text" id="location" name="location" class="form-control" 
                                placeholder="e.g., 123 Main St, City">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="stakeholders">Stakeholder Emails</label>
                        <input type="text" id="stakeholders" name="stakeholders" class="form-control" 
                            placeholder="email1@example.com, email2@example.com">
                        <small>Comma-separated email addresses</small>
                    </div>

                    <div class="form-group">
                        <label for="tags">Tags</label>
                        <input type="text" id="tags" name="tags" class="form-control" 
                            placeholder="residential, high-priority">
                        <small>Comma-separated tags</small>
                    </div>

                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Create Project</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup event listeners
    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // Load templates for preview
    const { fetchTemplates } = await import('../services/api.js');
    const templates = await fetchTemplates();
    const templateMap = {};
    templates.forEach(t => {
        templateMap[t.id] = t;
    });

    // Show milestone preview when project type changes
    document.getElementById('project-type').addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const templateId = selectedOption?.dataset.templateId;
        const previewDiv = document.getElementById('milestone-preview');
        const previewList = document.getElementById('milestone-preview-list');
        
        if (templateId && templateMap[templateId]) {
            const template = templateMap[templateId];
            const startDate = document.getElementById('start-date').value;
            
            previewDiv.style.display = 'block';
            previewList.innerHTML = template.milestones.map(m => {
                const dueDate = startDate 
                    ? calculateDate(startDate, m.dueOffsetDays)
                    : `T+${m.dueOffsetDays}d`;
                return `
                    <div class="milestone-preview-item">
                        <span class="milestone-order">${m.order}</span>
                        <span class="milestone-name">${escapeHtml(m.name)}</span>
                        <span class="milestone-offset">${dueDate}</span>
                    </div>
                `;
            }).join('');
        } else {
            previewDiv.style.display = 'none';
        }
    });

    // Update dates when start date changes
    document.getElementById('start-date').addEventListener('change', () => {
        const typeSelect = document.getElementById('project-type');
        typeSelect.dispatchEvent(new Event('change'));
    });

    // Handle form submission
    document.getElementById('new-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            
            // Parse stakeholders
            const stakeholdersStr = formData.get('stakeholders');
            const stakeholderEmails = stakeholdersStr 
                ? stakeholdersStr.split(',').map(e => e.trim()).filter(e => e)
                : [];

            // Parse tags
            const tagsStr = formData.get('tags');
            const tags = tagsStr 
                ? tagsStr.split(',').map(t => t.trim()).filter(t => t)
                : [];

            const projectData = {
                name: formData.get('name'),
                code: formData.get('code') || null,
                projectTypeId: formData.get('projectTypeId'),
                ownerUserId: formData.get('ownerUserId'),
                startDate: formData.get('startDate'),
                location: formData.get('location') || null,
                stakeholderEmails,
                tags
            };

            const result = await createProject(projectData);
            
            closeModal();
            
            // Show success message
            showToast('Project created successfully!', 'success');
            
            // Navigate to project details or reload grid
            if (result.id) {
                window.location.hash = `#/projects/${result.id}`;
            } else {
                window.location.reload();
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Project';
        }
    });
}

function calculateDate(startDate, offsetDays) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offsetDays);
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
