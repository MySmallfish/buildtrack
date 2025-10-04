import { fetchMilestoneTypes, fetchDocumentTypes, createMilestoneType } from '../services/api.js';

export async function renderMilestoneTypesPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Settings</span>
                <span class="breadcrumb-separator">/</span>
                <span>Milestone Types</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Milestone Types</h1>
                    <p class="text-muted">Define milestone categories with document requirements</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-type-btn">+ Add Milestone Type</button>
                </div>
            </div>
            
            <div id="types-list" class="loading">
                <p>Loading milestone types...</p>
            </div>
        </div>
    `;

    document.getElementById('add-type-btn').addEventListener('click', () => {
        showAddMilestoneTypeModal();
    });

    await loadMilestoneTypes();
}

async function loadMilestoneTypes() {
    const listContainer = document.getElementById('types-list');
    
    try {
        const types = await fetchMilestoneTypes();
        
        if (types.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No milestone types yet</h3>
                <p>Create milestone types to categorize project milestones</p>
            `;
            return;
        }

        listContainer.className = 'milestone-types-grid';
        listContainer.innerHTML = types.map(type => `
            <div class="milestone-type-card">
                <div class="type-header">
                    <h3>${escapeHtml(type.name)}</h3>
                </div>
                <div class="type-body">
                    ${type.description ? `<p class="type-description">${escapeHtml(type.description)}</p>` : ''}
                    <div class="type-info">
                        <span class="info-label">Document Requirements:</span>
                        <span>${type.documentRequirementTemplates?.length || 0}</span>
                    </div>
                    ${type.documentRequirementTemplates && type.documentRequirementTemplates.length > 0 ? `
                        <div class="requirements-list">
                            ${type.documentRequirementTemplates.map(req => `
                                <div class="requirement-item">
                                    <span class="req-icon">${req.required ? '⚠️' : '📄'}</span>
                                    <span>${escapeHtml(req.documentType?.name || 'Document')}</span>
                                    ${req.required ? '<span class="req-required">Required</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted">No requirements</p>'}
                </div>
                <div class="type-footer">
                    <button class="btn btn-sm" onclick="window.editMilestoneType('${type.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteMilestoneType('${type.id}', '${escapeHtml(type.name)}')">Delete</button>
                </div>
            </div>
        `).join('');
        
        window.currentMilestoneTypes = types;
    } catch (error) {
        console.error('Error loading milestone types:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load milestone types</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddMilestoneTypeModal() {
    const documentTypes = await fetchDocumentTypes();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Add Milestone Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-type-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="type-name">Name *</label>
                        <input type="text" id="type-name" name="name" class="form-control" required 
                            placeholder="e.g., Inspection, Permit, Delivery">
                    </div>
                    <div class="form-group">
                        <label for="type-description">Description</label>
                        <textarea id="type-description" name="description" class="form-control" rows="3"
                            placeholder="Optional description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Document Requirements</label>
                        <div class="checkbox-group">
                            ${documentTypes.map(docType => `
                                <div class="checkbox-row">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="docTypes" value="${docType.id}">
                                        <span>${escapeHtml(docType.name)}</span>
                                    </label>
                                    <label class="checkbox-sublabel">
                                        <input type="checkbox" name="required_${docType.id}" value="true">
                                        <small>Required</small>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                        <small>Select which document types are needed for this milestone</small>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Milestone Type</button>
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
            const selectedDocTypes = Array.from(formData.getAll('docTypes'));

            const documentRequirementTemplates = selectedDocTypes.map(docTypeId => ({
                documentTypeId: docTypeId,
                required: formData.get(`required_${docTypeId}`) === 'true'
            }));

            const data = {
                name: formData.get('name'),
                description: formData.get('description') || null,
                documentRequirementTemplates
            };

            await createMilestoneType(data);
            
            closeModal();
            showToast('Milestone type added successfully!', 'success');
            await loadMilestoneTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Milestone Type';
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

window.editMilestoneType = async (typeId) => {
    const type = window.currentMilestoneTypes?.find(t => t.id === typeId);
    if (!type) {
        showToast('Milestone type not found', 'error');
        return;
    }

    const documentTypes = await fetchDocumentTypes();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Edit Milestone Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="edit-type-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-type-name">Name *</label>
                        <input type="text" id="edit-type-name" name="name" class="form-control" required 
                            value="${escapeHtml(type.name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-type-description">Description</label>
                        <textarea id="edit-type-description" name="description" class="form-control" rows="3">${escapeHtml(type.description || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Document Requirements</label>
                        <div class="checkbox-group">
                            ${documentTypes.map(docType => {
                                const isSelected = type.documentRequirementTemplates?.some(req => req.documentTypeId === docType.id);
                                const isRequired = type.documentRequirementTemplates?.find(req => req.documentTypeId === docType.id)?.required;
                                return `
                                    <div class="checkbox-row">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="docTypes" value="${docType.id}" ${isSelected ? 'checked' : ''}>
                                            <span>${escapeHtml(docType.name)}</span>
                                        </label>
                                        <label class="checkbox-sublabel">
                                            <input type="checkbox" name="required_${docType.id}" value="true" ${isRequired ? 'checked' : ''}>
                                            <small>Required</small>
                                        </label>
                                    </div>
                                `;
                            }).join('')}
                        </div>
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
            const selectedDocTypes = Array.from(formData.getAll('docTypes'));

            const documentRequirementTemplates = selectedDocTypes.map(docTypeId => ({
                documentTypeId: docTypeId,
                required: formData.get(`required_${docTypeId}`) === 'true'
            }));

            const data = {
                name: formData.get('name'),
                description: formData.get('description') || null,
                documentRequirementTemplates
            };

            const { updateMilestoneType } = await import('../services/api.js');
            await updateMilestoneType({ typeId, data });
            
            closeModal();
            showToast('Milestone type updated successfully!', 'success');
            await loadMilestoneTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    });
};

window.deleteMilestoneType = async (typeId, typeName) => {
    if (!confirm(`Are you sure you want to delete "${typeName}"?\n\nThis will fail if the type is used in any templates.`)) {
        return;
    }

    try {
        const { deleteMilestoneType } = await import('../services/api.js');
        await deleteMilestoneType(typeId);
        showToast('Milestone type deleted successfully!', 'success');
        await loadMilestoneTypes();
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
};
