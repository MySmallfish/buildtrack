import { fetchUsers, updateProject } from '../services/api.js';

export async function showEditProjectModal(project) {
    // Load users for owner dropdown
    const users = await fetchUsers();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'edit-project-modal';
    
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Edit Project</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="edit-project-form">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="project-name">Project Name *</label>
                            <input type="text" id="project-name" name="name" class="form-control" required 
                                value="${escapeHtml(project.name)}">
                        </div>
                        <div class="form-group">
                            <label for="project-code">Project Code</label>
                            <input type="text" id="project-code" class="form-control" 
                                value="${escapeHtml(project.code)}" disabled>
                            <small class="text-muted">Project code cannot be changed</small>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="project-owner">Project Owner *</label>
                            <select id="project-owner" name="ownerUserId" class="form-control" required>
                                ${users.filter(u => u.role === 'Admin' || u.role === 'ProjectManager').map(u => `
                                    <option value="${u.id}" ${u.id === project.owner.id ? 'selected' : ''}>
                                        ${escapeHtml(u.fullName)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="start-date">Start Date *</label>
                            <input type="date" id="start-date" name="startDate" class="form-control" required 
                                value="${formatDateForInput(project.startDate)}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="location">Location</label>
                        <input type="text" id="location" name="location" class="form-control" 
                            value="${escapeHtml(project.location || '')}"
                            placeholder="e.g., 123 Main St, City">
                    </div>

                    <div class="form-group">
                        <label for="stakeholders">Stakeholder Emails</label>
                        <input type="text" id="stakeholders" name="stakeholders" class="form-control" 
                            value="${(project.stakeholderEmails || []).join(', ')}"
                            placeholder="email1@example.com, email2@example.com">
                        <small>Comma-separated email addresses</small>
                    </div>

                    <div class="form-group">
                        <label for="tags">Tags</label>
                        <input type="text" id="tags" name="tags" class="form-control" 
                            value="${(project.tags || []).join(', ')}"
                            placeholder="residential, high-priority">
                        <small>Comma-separated tags</small>
                    </div>

                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Save Changes</button>
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

    // Handle form submission
    document.getElementById('edit-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
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

            const updateData = {
                name: formData.get('name'),
                ownerUserId: formData.get('ownerUserId'),
                startDate: formData.get('startDate'),
                location: formData.get('location') || null,
                stakeholderEmails,
                tags
            };

            await updateProject(project.id, updateData);
            
            closeModal();
            
            // Show success message
            showToast('Project updated successfully!', 'success');
            
            // Emit event for page to refresh
            window.dispatchEvent(new CustomEvent('project-updated', { detail: { projectId: project.id } }));
            
            // Reload the page to show updated data
            if (window.location.hash.includes(`/project/${project.id}`)) {
                window.location.reload();
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    });
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
