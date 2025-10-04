import { fetchTemplates, fetchMilestoneTypes, createTemplate } from '../services/api.js';

export async function renderTemplatesPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Settings</span>
                <span class="breadcrumb-separator">/</span>
                <span>Templates</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Project Templates</h1>
                    <p class="text-muted">Define milestone sequences for project types</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-template-btn">+ Create Template</button>
                </div>
            </div>
            
            <div id="templates-list" class="loading">
                <p>Loading templates...</p>
            </div>
        </div>
    `;

    document.getElementById('add-template-btn').addEventListener('click', () => {
        showAddTemplateModal();
    });

    await loadTemplates();
}

async function loadTemplates() {
    const listContainer = document.getElementById('templates-list');
    
    try {
        const templates = await fetchTemplates();
        
        if (templates.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No templates yet</h3>
                <p>Create your first template to define milestone sequences</p>
            `;
            return;
        }

        listContainer.className = 'templates-grid';
        listContainer.innerHTML = templates.map(template => `
            <div class="template-card">
                <div class="template-header">
                    <h3>${escapeHtml(template.name)}</h3>
                    <span class="badge">v${template.version}</span>
                </div>
                <div class="template-body">
                    <div class="template-info">
                        <span class="info-label">Milestones:</span>
                        <span>${template.milestones?.length || 0}</span>
                    </div>
                    ${template.milestones && template.milestones.length > 0 ? `
                        <div class="milestone-list">
                            ${template.milestones.map(m => `
                                <div class="milestone-item">
                                    <span class="milestone-order">${m.order}</span>
                                    <div class="milestone-details">
                                        <strong>${escapeHtml(m.name)}</strong>
                                        <small>Due: T + ${m.dueOffsetDays} days</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted">No milestones defined</p>'}
                </div>
                <div class="template-footer">
                    <button class="btn btn-sm" onclick="window.viewTemplate('${template.id}')">View Details</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading templates:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load templates</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddTemplateModal() {
    const milestoneTypes = await fetchMilestoneTypes();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Create Template</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-template-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="template-name">Template Name *</label>
                        <input type="text" id="template-name" name="name" class="form-control" required 
                            placeholder="e.g., Residential Building Standard">
                    </div>
                    
                    <div class="form-group">
                        <label>Milestones</label>
                        <div id="milestones-container">
                            <!-- Milestones will be added here -->
                        </div>
                        <button type="button" class="btn btn-sm" id="add-milestone-btn">+ Add Milestone</button>
                    </div>

                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Create Template</button>
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

    let milestoneCounter = 0;
    const milestonesContainer = document.getElementById('milestones-container');

    function addMilestoneRow() {
        milestoneCounter++;
        const row = document.createElement('div');
        row.className = 'milestone-row';
        row.dataset.index = milestoneCounter;
        row.innerHTML = `
            <div class="milestone-row-content">
                <input type="text" name="milestone_name_${milestoneCounter}" class="form-control" 
                    placeholder="Milestone name" required>
                <select name="milestone_type_${milestoneCounter}" class="form-control" required>
                    <option value="">Select type...</option>
                    ${milestoneTypes.map(type => `
                        <option value="${type.id}">${escapeHtml(type.name)}</option>
                    `).join('')}
                </select>
                <input type="number" name="milestone_offset_${milestoneCounter}" class="form-control" 
                    placeholder="Days" min="0" value="30" required>
                <button type="button" class="btn-icon" onclick="this.closest('.milestone-row').remove()">✕</button>
            </div>
        `;
        milestonesContainer.appendChild(row);
    }

    // Add first milestone row
    addMilestoneRow();

    document.getElementById('add-milestone-btn').addEventListener('click', addMilestoneRow);

    document.getElementById('add-template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const name = formData.get('name');

            // Collect milestones
            const milestones = [];
            const rows = milestonesContainer.querySelectorAll('.milestone-row');
            rows.forEach((row, index) => {
                const idx = row.dataset.index;
                milestones.push({
                    name: formData.get(`milestone_name_${idx}`),
                    milestoneTypeId: formData.get(`milestone_type_${idx}`),
                    dueOffsetDays: parseInt(formData.get(`milestone_offset_${idx}`)),
                    order: index + 1
                });
            });

            if (milestones.length === 0) {
                throw new Error('Please add at least one milestone');
            }

            const data = {
                name,
                version: 1,
                milestones
            };

            await createTemplate(data);
            
            closeModal();
            showToast('Template created successfully!', 'success');
            await loadTemplates();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Template';
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

window.viewTemplate = async (templateId) => {
    const templates = await fetchTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        showToast('Template not found', 'error');
        return;
    }

    const milestoneTypes = await fetchMilestoneTypes();
    const typeMap = {};
    milestoneTypes.forEach(t => {
        typeMap[t.id] = t;
    });

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>${escapeHtml(template.name)} (v${template.version})</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="template-details">
                    <h4>Milestones (${template.milestones?.length || 0})</h4>
                    ${template.milestones && template.milestones.length > 0 ? `
                        <div class="milestone-details-list">
                            ${template.milestones.map(m => {
                                const type = typeMap[m.milestoneTypeId];
                                return `
                                    <div class="milestone-detail-card">
                                        <div class="milestone-detail-header">
                                            <span class="milestone-order">${m.order}</span>
                                            <div class="milestone-detail-info">
                                                <strong>${escapeHtml(m.name)}</strong>
                                                <small>Type: ${escapeHtml(type?.name || 'Unknown')}</small>
                                            </div>
                                            <span class="milestone-offset">T+${m.dueOffsetDays}d</span>
                                        </div>
                                        ${type?.documentRequirementTemplates && type.documentRequirementTemplates.length > 0 ? `
                                            <div class="milestone-detail-requirements">
                                                <small class="text-muted">Document Requirements:</small>
                                                <div class="requirements-tags">
                                                    ${type.documentRequirementTemplates.map(req => `
                                                        <span class="req-tag ${req.required ? 'req-required' : ''}">
                                                            ${req.required ? '⚠️' : '📄'} ${escapeHtml(req.documentType?.name || 'Document')}
                                                        </span>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : '<p class="text-muted">No milestones defined</p>'}
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="close-btn">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('close-btn').addEventListener('click', closeModal);
};
