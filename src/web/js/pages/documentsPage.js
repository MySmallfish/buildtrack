import { fetchDocuments } from '../services/api.js';

export async function renderDocumentsPage(container) {
    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Documents</h1>
                <div class="grid-actions">
                    <button class="btn btn-primary" id="upload-document-btn">
                        📎 Upload Document
                    </button>
                </div>
            </div>
            <div class="grid-filters">
                <select id="status-filter" class="form-control">
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <select id="project-filter" class="form-control" style="margin-left: 12px;">
                    <option value="">All Projects</option>
                </select>
            </div>
            <div id="documents-content" class="loading">
                <p>Loading documents...</p>
            </div>
        </div>
    `;

    // Setup event listeners
    document.getElementById('upload-document-btn')?.addEventListener('click', () => {
        showUploadInfo();
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        loadDocuments({ status: e.target.value });
    });

    document.getElementById('project-filter')?.addEventListener('change', (e) => {
        loadDocuments({ projectId: e.target.value });
    });

    // Load initial data
    await loadDocuments({});
}

async function loadDocuments({ status = null, projectId = null } = {}) {
    const documentsContent = document.getElementById('documents-content');
    
    try {
        documentsContent.className = 'loading';
        documentsContent.innerHTML = '<p>Loading documents...</p>';

        const filters = {};
        if (status) filters.status = status;
        if (projectId) filters.projectId = projectId;

        const documents = await fetchDocuments(filters);
        
        if (!documents || documents.length === 0) {
            documentsContent.className = 'empty-state';
            documentsContent.innerHTML = `
                <h3>No documents found</h3>
                <p>Documents uploaded to project milestones will appear here</p>
            `;
            return;
        }

        renderDocumentsTable(documents, documentsContent);
    } catch (error) {
        console.error('Error loading documents:', error);
        documentsContent.className = 'empty-state';
        documentsContent.innerHTML = `
            <h3>Unable to load documents</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        `;
    }
}

function renderDocumentsTable(documents, container) {
    container.className = 'grid-table-wrapper';
    
    const tableHTML = `
        <table class="grid-table">
            <thead>
                <tr>
                    <th>File Name</th>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Uploaded By</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${documents.map(doc => renderDocumentRow(doc)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;

    // Attach event listeners
    documents.forEach(doc => {
        const downloadBtn = document.getElementById(`download-${doc.id}`);
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await downloadDocument(doc.id, doc.fileName);
            });
        }

        if (doc.status === 'Pending') {
            const approveBtn = document.getElementById(`approve-${doc.id}`);
            const rejectBtn = document.getElementById(`reject-${doc.id}`);
            
            if (approveBtn) {
                approveBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await approveDocument(doc.id);
                });
            }
            
            if (rejectBtn) {
                rejectBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await rejectDocument(doc.id);
                });
            }
        }
    });
}

function renderDocumentRow(doc) {
    const statusClass = `status-${doc.status.toLowerCase()}`;
    const uploadedDate = new Date(doc.uploadedAt).toLocaleDateString();
    const fileSize = formatFileSize(doc.fileSizeBytes);

    const actionButtons = doc.status === 'Pending' 
        ? `
            <button class="btn btn-sm btn-success" id="approve-${doc.id}" title="Approve">✓</button>
            <button class="btn btn-sm btn-danger" id="reject-${doc.id}" title="Reject">✗</button>
          `
        : `<button class="btn btn-sm" id="download-${doc.id}" title="Download">⬇</button>`;

    return `
        <tr data-document-id="${doc.id}">
            <td><strong>${escapeHtml(doc.fileName)}</strong></td>
            <td>${escapeHtml(doc.projectName || '-')}</td>
            <td>${escapeHtml(doc.milestoneName || '-')}</td>
            <td>${fileSize}</td>
            <td><span class="status-badge ${statusClass}">${doc.status}</span></td>
            <td>${uploadedDate}</td>
            <td>${escapeHtml(doc.uploadedBy)}</td>
            <td>${actionButtons}</td>
        </tr>
    `;
}

async function downloadDocument(documentId, fileName) {
    try {
        const { getDocumentDownloadUrl } = await import('../services/api.js');
        const { url } = await getDocumentDownloadUrl(documentId);
        
        // Open download in new tab
        window.open(url, '_blank');
    } catch (error) {
        showToast('Failed to download document: ' + error.message, 'error');
    }
}

async function approveDocument(documentId) {
    try {
        const { approveDocument: approve } = await import('../services/api.js');
        await approve(documentId);
        showToast('Document approved', 'success');
        await loadDocuments({});
    } catch (error) {
        showToast('Failed to approve document: ' + error.message, 'error');
    }
}

async function rejectDocument(documentId) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
        const { rejectDocument: reject } = await import('../services/api.js');
        await reject(documentId, reason);
        showToast('Document rejected', 'success');
        await loadDocuments({});
    } catch (error) {
        showToast('Failed to reject document: ' + error.message, 'error');
    }
}

async function showUploadInfo() {
    // Get list of projects and milestones for selection
    const { fetchProjects } = await import('../services/api.js');
    const { rows: projects } = await fetchProjects({ filters: { status: 'Active' } });
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Upload Document</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="doc-project">Project</label>
                    <select id="doc-project" class="form-control" required>
                        <option value="">Select project...</option>
                        ${projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="doc-milestone">Milestone</label>
                    <select id="doc-milestone" class="form-control" required disabled>
                        <option value="">Select project first...</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="doc-type">Document Type</label>
                    <select id="doc-type" class="form-control" required>
                        <option value="">Select type...</option>
                        <option value="Permit">Permit</option>
                        <option value="Drawing">Drawing</option>
                        <option value="Report">Report</option>
                        <option value="Certificate">Certificate</option>
                        <option value="Photo">Photo</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="doc-file">File</label>
                    <input type="file" id="doc-file" class="form-control" required>
                    <small class="text-muted">Max 50MB</small>
                </div>
                
                <div class="form-group">
                    <label for="doc-notes">Notes (optional)</label>
                    <textarea id="doc-notes" class="form-control" rows="3" placeholder="Add any notes about this document..."></textarea>
                </div>
                
                <div id="upload-error" class="error-message" style="display: none;"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="cancel-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="upload-btn">Upload</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    // Load milestones when project is selected
    document.getElementById('doc-project').addEventListener('change', async (e) => {
        const projectId = e.target.value;
        const milestoneSelect = document.getElementById('doc-milestone');
        
        if (!projectId) {
            milestoneSelect.disabled = true;
            milestoneSelect.innerHTML = '<option value="">Select project first...</option>';
            return;
        }
        
        try {
            const { fetchProjectSummary } = await import('../services/api.js');
            const { project } = await fetchProjectSummary({ projectId });
            
            if (project.milestones && project.milestones.length > 0) {
                milestoneSelect.disabled = false;
                milestoneSelect.innerHTML = `
                    <option value="">Select milestone...</option>
                    ${project.milestones.map(m => `<option value="${m.id}">${escapeHtml(m.name || m.type)}</option>`).join('')}
                `;
            } else {
                milestoneSelect.disabled = true;
                milestoneSelect.innerHTML = '<option value="">No milestones found</option>';
            }
        } catch (error) {
            console.error('Failed to load milestones:', error);
            milestoneSelect.disabled = true;
            milestoneSelect.innerHTML = '<option value="">Error loading milestones</option>';
        }
    });
    
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const projectId = document.getElementById('doc-project').value;
        const milestoneId = document.getElementById('doc-milestone').value;
        const docType = document.getElementById('doc-type').value;
        const docFile = document.getElementById('doc-file').files[0];
        const docNotes = document.getElementById('doc-notes').value;
        const errorDiv = document.getElementById('upload-error');
        const uploadBtn = document.getElementById('upload-btn');
        
        if (!projectId || !milestoneId || !docType || !docFile) {
            errorDiv.textContent = 'Please fill in all required fields';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (docFile.size > 50 * 1024 * 1024) {
            errorDiv.textContent = 'File size exceeds 50MB limit';
            errorDiv.style.display = 'block';
            return;
        }
        
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        errorDiv.style.display = 'none';
        
        try {
            const { createMilestoneDocument } = await import('../services/api.js');
            
            await createMilestoneDocument({
                milestoneId: milestoneId,
                fileName: docFile.name,
                fileSize: docFile.size,
                documentType: docType,
                notes: docNotes
            });
            
            closeModal();
            showToast('Document uploaded successfully', 'success');
            
            // Reload documents list
            await loadDocuments({});
        } catch (error) {
            errorDiv.textContent = 'Upload failed: ' + error.message;
            errorDiv.style.display = 'block';
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
        }
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
