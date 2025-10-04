import { fetchDocumentTypes, createDocumentType } from '../services/api.js';

export async function renderDocumentTypesPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Settings</span>
                <span class="breadcrumb-separator">/</span>
                <span>Document Types</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Document Types</h1>
                    <p class="text-muted">Manage document categories and allowed file types</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-doctype-btn">+ Add Document Type</button>
                </div>
            </div>
            
            <div id="doctypes-list" class="loading">
                <p>Loading document types...</p>
            </div>
        </div>
    `;

    document.getElementById('add-doctype-btn').addEventListener('click', () => {
        showAddDocumentTypeModal();
    });

    await loadDocumentTypes();
}

async function loadDocumentTypes() {
    const listContainer = document.getElementById('doctypes-list');
    
    try {
        const types = await fetchDocumentTypes();
        
        if (types.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No document types yet</h3>
                <p>Create document types to categorize uploaded files</p>
            `;
            return;
        }

        listContainer.className = 'doctypes-grid';
        listContainer.innerHTML = types.map(type => `
            <div class="doctype-card">
                <div class="type-header">
                    <h3>${escapeHtml(type.name)}</h3>
                </div>
                <div class="type-body">
                    <div class="type-info">
                        <span class="info-label">Allowed Extensions:</span>
                        <div class="extensions-list">
                            ${type.allowedExtensions?.map(ext => `
                                <span class="extension-badge">.${ext}</span>
                            `).join('') || '<span class="text-muted">All types</span>'}
                        </div>
                    </div>
                    ${type.maxSizeMb ? `
                        <div class="type-info">
                            <span class="info-label">Max Size:</span>
                            <span>${type.maxSizeMb} MB</span>
                        </div>
                    ` : ''}
                </div>
                <div class="type-footer">
                    <button class="btn btn-sm" onclick="window.editDocumentType('${type.id}', '${escapeHtml(type.name)}', '${(type.allowedExtensions || []).join(',')}', ${type.maxSizeMb || 'null'})">Edit</button>
                </div>
            </div>
        `).join('');
        
        window.currentDocumentTypes = types;
    } catch (error) {
        console.error('Error loading document types:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load document types</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddDocumentTypeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add Document Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-doctype-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="doctype-name">Name *</label>
                        <input type="text" id="doctype-name" name="name" class="form-control" required 
                            placeholder="e.g., Permit, Invoice, Photo">
                    </div>
                    <div class="form-group">
                        <label for="doctype-extensions">Allowed Extensions</label>
                        <input type="text" id="doctype-extensions" name="extensions" class="form-control" 
                            placeholder="pdf, jpg, png, docx (leave empty for all types)">
                        <small>Comma-separated list without dots</small>
                    </div>
                    <div class="form-group">
                        <label for="doctype-maxsize">Max Size (MB)</label>
                        <input type="number" id="doctype-maxsize" name="maxSizeMb" class="form-control" 
                            placeholder="10" min="1" max="100">
                        <small>Leave empty for no limit</small>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Document Type</button>
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

    document.getElementById('add-doctype-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const extensionsStr = formData.get('extensions');
            const allowedExtensions = extensionsStr 
                ? extensionsStr.split(',').map(e => e.trim().toLowerCase()).filter(e => e)
                : [];

            const data = {
                name: formData.get('name'),
                allowedExtensions: allowedExtensions.length > 0 ? allowedExtensions : null,
                maxSizeMb: formData.get('maxSizeMb') ? parseInt(formData.get('maxSizeMb')) : null
            };

            // Call API
            await createDocumentType(data);
            
            closeModal();
            showToast('Document type added successfully!', 'success');
            await loadDocumentTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Document Type';
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

window.editDocumentType = async (typeId, name, extensions, maxSize) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Document Type</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="edit-doctype-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-doctype-name">Name *</label>
                        <input type="text" id="edit-doctype-name" name="name" class="form-control" required 
                            value="${escapeHtml(name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-doctype-extensions">Allowed Extensions</label>
                        <input type="text" id="edit-doctype-extensions" name="extensions" class="form-control" 
                            value="${escapeHtml(extensions)}" placeholder="pdf, jpg, png, docx">
                        <small>Comma-separated list without dots</small>
                    </div>
                    <div class="form-group">
                        <label for="edit-doctype-maxsize">Max Size (MB)</label>
                        <input type="number" id="edit-doctype-maxsize" name="maxSizeMb" class="form-control" 
                            value="${maxSize || ''}" placeholder="10" min="1" max="100">
                        <small>Leave empty for no limit</small>
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

    document.getElementById('edit-doctype-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const extensionsStr = formData.get('extensions');
            const allowedExtensions = extensionsStr 
                ? extensionsStr.split(',').map(e => e.trim().toLowerCase()).filter(e => e)
                : [];

            const data = {
                name: formData.get('name'),
                allowedExtensions: allowedExtensions.length > 0 ? allowedExtensions : null,
                maxSizeMb: formData.get('maxSizeMb') ? parseInt(formData.get('maxSizeMb')) : null
            };

            const { updateDocumentType } = await import('../services/api.js');
            await updateDocumentType({ typeId, data });
            
            closeModal();
            showToast('Document type updated successfully!', 'success');
            await loadDocumentTypes();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    });
};
