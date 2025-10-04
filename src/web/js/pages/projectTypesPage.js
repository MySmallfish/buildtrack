import { fetchProjectTypes, fetchTemplates, createProjectType, updateProjectType } from '../services/api.js';

export async function renderProjectTypesPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Projects</span>
                <span class="breadcrumb-separator">/</span>
                <span>Project Types</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Project Types</h1>
                    <p class="text-muted">Manage project types and their templates</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-type-btn">+ Add Project Type</button>
                </div>
            </div>
            
            <div id="types-list" class="loading">
                <p>Loading project types...</p>
            </div>
        </div>
    `;

    document.getElementById('add-type-btn').addEventListener('click', () => {
        showAddProjectTypeModal();
    });

    await loadProjectTypes();
}

async function loadProjectTypes() {
    const listContainer = document.getElementById('types-list');
    
    try {
        const types = await fetchProjectTypes();
        
        if (types.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No project types yet</h3>
                <p>Create your first project type to get started</p>
            `;
            return;
        }

        // Fetch templates to show milestone counts
        const templates = await fetchTemplates();
        const templateMap = {};
        templates.forEach(t => {
            templateMap[t.id] = t;
        });

        listContainer.className = 'types-grid';
        listContainer.innerHTML = types.map(type => {
            const template = type.templateId ? templateMap[type.templateId] : null;
            const milestoneCount = template?.milestones?.length || 0;
            
            return `
            <div class="type-card">
                <div class="type-header">
                    <h3>${escapeHtml(type.name)}</h3>
                </div>
                <div class="type-body">
                    ${type.description ? `<p class="type-description">${escapeHtml(type.description)}</p>` : ''}
                    ${template ? `
                        <div class="type-info">
                            <span class="info-label">Template:</span>
                            <span class="badge badge-success">${escapeHtml(template.name)} (v${template.version})</span>
                        </div>
                        <div class="type-info">
                            <span class="info-label">Milestones:</span>
                            <span>${milestoneCount} milestone(s)</span>
                        </div>
                        ${milestoneCount > 0 ? `
                            <div class="milestone-preview">
                                ${template.milestones.slice(0, 3).map(m => `
                                    <div class="milestone-preview-item">
                                        <span class="milestone-order">${m.order}</span>
                                        <span class="milestone-name">${escapeHtml(m.name)}</span>
                                        <span class="milestone-offset">T+${m.dueOffsetDays}d</span>
                                    </div>
                                `).join('')}
                                ${milestoneCount > 3 ? `<small class="text-muted">+${milestoneCount - 3} more...</small>` : ''}
                            </div>
                        ` : ''}
                    ` : `
                        <div class="type-info">
                            <span class="info-label">Template:</span>
                            <span class="text-muted">None</span>
                        </div>
                    `}
                </div>
                <div class="type-footer">
                    <button class="btn btn-sm" onclick="window.editProjectType('${type.id}', '${escapeHtml(type.name)}', '${type.description || ''}', '${type.templateId || ''}')">Edit</button>
                </div>
            </div>
        `}).join('');
        
        // Store types globally for edit
        window.currentProjectTypes = types;
    } catch (error) {
        console.error('Error loading project types:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load project types</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddProjectTypeModal() {
    const templates = await fetchTemplates();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add Project Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-type-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="type-name">Name *</label>
                        <input type="text" id="type-name" name="name" class="form-control" required 
                            placeholder="e.g., Residential Building">
                    </div>
                    <div class="form-group">
                        <label for="type-description">Description</label>
                        <textarea id="type-description" name="description" class="form-control" rows="3"
                            placeholder="Optional description"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="type-template">Template</label>
                        <select id="type-template" name="templateId" class="form-control">
                            <option value="">No template</option>
                            ${templates.map(t => `
                                <option value="${t.id}">${escapeHtml(t.name)} (v${t.version})</option>
                            `).join('')}
                        </select>
                        <small>Templates define the milestones for this project type</small>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Project Type</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('add-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description') || null,
                templateId: formData.get('templateId') || null
            };

            await createProjectType(data);
            
            closeModal();
            showToast('Project type added successfully!', 'success');
            await loadProjectTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Project Type';
        }
    });
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

window.editProjectType = async (typeId, name, description, templateId) => {
    const templates = await fetchTemplates();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Project Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="edit-type-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-type-name">Name *</label>
                        <input type="text" id="edit-type-name" name="name" class="form-control" required 
                            value="${escapeHtml(name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-type-description">Description</label>
                        <textarea id="edit-type-description" name="description" class="form-control" rows="3">${escapeHtml(description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-type-template">Template</label>
                        <select id="edit-type-template" name="templateId" class="form-control">
                            <option value="">No template</option>
                            ${templates.map(t => `
                                <option value="${t.id}" ${t.id === templateId ? 'selected' : ''}>
                                    ${escapeHtml(t.name)} (v${t.version}) - ${t.milestones?.length || 0} milestones
                                </option>
                            `).join('')}
                        </select>
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

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('edit-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description') || null,
                templateId: formData.get('templateId') || null
            };

            await updateProjectType({ typeId, data });
            
            closeModal();
            showToast('Project type updated successfully!', 'success');
            await loadProjectTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    });
};
