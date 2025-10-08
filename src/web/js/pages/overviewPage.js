import { fetchProjects } from '../services/api.js';

export async function renderOverviewPage(container) {
    container.innerHTML = `
        <div class="overview-page">
            <nav class="breadcrumb">
                <span>Home</span>
                <span class="breadcrumb-separator">/</span>
                <span>Overview</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Projects Overview</h1>
                    <p class="text-muted">Track all projects and milestones at a glance</p>
                </div>
            </div>
            
            <div id="grid-container" class="loading">
                <p>Loading projects...</p>
            </div>
        </div>
    `;

    await loadProjectsGrid();
}

async function loadProjectsGrid() {
    const gridContainer = document.getElementById('grid-container');
    
    try {
        // Fetch only active projects (exclude archived)
        const { rows: projects } = await fetchProjects({ filters: { status: 'Active' } });
        
        if (!projects || projects.length === 0) {
            gridContainer.className = 'empty-state';
            gridContainer.innerHTML = `
                <h3>No projects yet</h3>
                <p>Create your first project to get started</p>
            `;
            return;
        }

        // Fetch detailed project data with milestones for each project
        console.log('Fetching details for', projects.length, 'projects...');
        const { fetchProjectSummary } = await import('../services/api.js');
        
        const projectsWithMilestones = await Promise.all(
            projects.map(async (project) => {
                try {
                    const { project: projectDetails } = await fetchProjectSummary({ projectId: project.id });
                    return {
                        ...project,
                        milestones: projectDetails.milestones || []
                    };
                } catch (error) {
                    console.warn(`Failed to fetch milestones for project ${project.id}:`, error);
                    return {
                        ...project,
                        milestones: []
                    };
                }
            })
        );

        // Transform API data to grid format
        const gridData = transformToGridData(projectsWithMilestones);
        
        console.log('Projects with milestones:', projectsWithMilestones);
        console.log('Grid data:', gridData);

        // Dynamically import and register the grid component
        await import('../components/project-grid/project-grid.js');
        
        // Create and configure the grid
        gridContainer.className = '';
        gridContainer.innerHTML = '<project-grid id="projects-grid"></project-grid>';
        
        const grid = document.getElementById('projects-grid');
        
        // Wait for component to be ready
        await customElements.whenDefined('project-grid');
        
        grid.data = gridData;
        
        console.log('Grid data set:', grid.data);

        // Handle cell clicks - open milestone details drawer
        grid.addEventListener('cell-click', async (e) => {
            const { projectId, milestoneId, projectName, milestoneName, cell } = e.detail;
            console.log('Cell clicked:', e.detail);
            
            // Open milestone details drawer
            await showMilestoneDrawer({
                projectId,
                projectName,
                milestoneId,
                milestoneName,
                status: cell.status,
                skill: cell.skill
            });
        });

    } catch (error) {
        console.error('Error loading projects grid:', error);
        gridContainer.className = 'empty-state';
        gridContainer.innerHTML = `
            <h3>Unable to load projects</h3>
            <p>${error.message}</p>
        `;
    }
}

/**
 * Transform API projects data to grid format
 * Each project gets its own set of milestone columns
 * @param {Array} projects - Projects from API
 * @returns {Object} Grid data structure
 */
function transformToGridData(projects) {
    // Find the maximum number of milestones across all projects
    let maxMilestones = 0;
    projects.forEach(project => {
        if (project.milestones && Array.isArray(project.milestones)) {
            maxMilestones = Math.max(maxMilestones, project.milestones.length);
        }
    });

    // Create generic column headers based on max milestones
    const columns = [];
    for (let i = 0; i < maxMilestones; i++) {
        columns.push({
            id: `milestone-${i}`,
            name: '', // Empty name - milestone names shown in cells
            order: i
        });
    }

    // If no milestones found at all, show message
    if (maxMilestones === 0) {
        console.warn('No milestones found in any project');
        return { columns: [], rows: [] };
    }
    
    console.log(`Grid will have ${maxMilestones} columns for milestones`);

    // Transform projects to rows
    const rows = projects.map(project => {
        const cells = {};
        
        // Sort project milestones by order or index
        const sortedMilestones = (project.milestones || [])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Fill cells with actual milestones
        sortedMilestones.forEach((milestone, index) => {
            const colId = `milestone-${index}`;
            cells[colId] = {
                ...transformMilestoneToCell(milestone),
                milestoneName: milestone.name || milestone.type || `Milestone ${index + 1}`,
                milestoneId: milestone.id
            };
        });

        // Fill remaining columns with empty cells
        for (let i = sortedMilestones.length; i < maxMilestones; i++) {
            cells[`milestone-${i}`] = { 
                status: 'NOT_STARTED',
                milestoneName: '-',
                isEmpty: true
            };
        }

        return {
            projectId: project.id,
            projectName: project.name || 'Unnamed Project',
            meta: {
                owner: project.ownerName || project.owner || 'Unassigned',
                code: project.code || project.id,
                status: project.status || 'Active',
                milestoneCount: sortedMilestones.length
            },
            cells
        };
    });
    
    console.log('Rows created:', rows);

    return { columns, rows };
}

/**
 * Transform a milestone to a grid cell
 * @param {Object} milestone - Milestone from API
 * @returns {Object} Grid cell data
 */
function transformMilestoneToCell(milestone) {
    const cell = {
        status: mapMilestoneStatus(milestone.status),
        tooltip: `${milestone.name}\nDue: ${new Date(milestone.dueDate).toLocaleDateString()}\nStatus: ${milestone.status}`
    };

    // Determine if late (completed after due date)
    if (milestone.status === 'Completed' && milestone.completedAt) {
        const dueDate = new Date(milestone.dueDate);
        const completedDate = new Date(milestone.completedAt);
        cell.late = completedDate > dueDate;
    }

    // Add responsible skill for in-progress/risk/failed milestones
    if (milestone.responsibleSkill || milestone.assignedTo) {
        cell.skill = milestone.responsibleSkill || milestone.assignedTo;
    }

    // Check for risk/overdue conditions
    if (milestone.blockedFlag) {
        cell.status = 'RISK';
    } else if (milestone.failedCheckFlag) {
        cell.status = 'FAILED';
    } else if (milestone.status !== 'Completed') {
        // Check if overdue
        const now = new Date();
        const dueDate = new Date(milestone.dueDate);
        if (now > dueDate) {
            cell.status = 'OVERDUE';
        }
    }

    return cell;
}

/**
 * Map API milestone status to grid status
 * @param {string} apiStatus - Status from API
 * @returns {string} Grid status
 */
function mapMilestoneStatus(apiStatus) {
    switch (apiStatus) {
        case 'NotStarted':
            return 'NOT_STARTED';
        case 'InProgress':
            return 'IN_PROGRESS';
        case 'PendingReview':
            return 'PENDING_REVIEW';
        case 'Completed':
            return 'DONE';
        case 'Blocked':
            return 'BLOCKED';
        default:
            return 'NOT_STARTED';
    }
}

async function showMilestoneDrawer({ projectId, projectName, milestoneId, milestoneName, status, skill }) {
    // Fetch full milestone details
    const { fetchProjectSummary } = await import('../services/api.js');
    let milestoneData = null;
    
    try {
        const { project: projectDetails } = await fetchProjectSummary({ projectId });
        // milestoneId is now the actual milestone ID from the cell data
        milestoneData = projectDetails.milestones?.find(m => m.id === milestoneId);
        
        if (!milestoneData) {
            console.warn('Milestone not found:', milestoneId);
        }
    } catch (error) {
        console.error('Failed to fetch milestone details:', error);
    }

    const drawer = document.createElement('div');
    drawer.className = 'drawer-overlay';
    drawer.innerHTML = `
        <div class="drawer">
            <div class="drawer-header">
                <div>
                    <h3>${escapeHtml(milestoneName)}</h3>
                    <p class="text-muted">${escapeHtml(projectName)}</p>
                </div>
                <button class="btn-icon" id="close-drawer">✕</button>
            </div>
            <div class="drawer-body">
                <div class="status-section">
                    <h4>Current Status</h4>
                    <div class="status-badge status-${status.toLowerCase()}">${status.replace('_', ' ')}</div>
                    ${skill ? `<p class="text-muted">Assigned to: ${escapeHtml(skill)}</p>` : ''}
                    ${milestoneData?.dueDate ? `<p class="text-muted">Due: ${new Date(milestoneData.dueDate).toLocaleDateString()}</p>` : ''}
                </div>
                
                <div class="update-status-section">
                    <h4>Update Status</h4>
                    <select id="status-select" class="form-control">
                        <option value="NotStarted" ${status === 'NOT_STARTED' ? 'selected' : ''}>Not Started</option>
                        <option value="InProgress" ${status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                        <option value="PendingReview" ${status === 'PENDING_REVIEW' ? 'selected' : ''}>Pending Review</option>
                        <option value="Blocked" ${status === 'BLOCKED' || status === 'RISK' ? 'selected' : ''}>Risk</option>
                        <option value="Completed" ${status === 'DONE' ? 'selected' : ''}>Done</option>
                    </select>
                    <textarea id="status-comment" class="form-control" placeholder="Add a comment about this status change..." rows="3" style="margin-top: 8px;"></textarea>
                    <button class="btn btn-primary btn-block" id="save-status-btn" style="margin-top: 8px;">
                        Save Status Update
                    </button>
                </div>
                
                <div class="documents-section">
                    <h4>Documents</h4>
                    <button class="btn btn-block" id="upload-document-btn">
                        📎 Upload Document
                    </button>
                    <div id="documents-list" style="margin-top: 12px;">
                        <p class="text-muted">No documents yet</p>
                    </div>
                </div>
                
                <div class="actions-section">
                    <button class="btn btn-block" id="view-project-btn">
                        View Full Project Timeline
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(drawer);

    const closeDrawer = () => {
        document.body.removeChild(drawer);
    };

    document.getElementById('close-drawer').addEventListener('click', closeDrawer);
    drawer.addEventListener('click', (e) => {
        if (e.target === drawer) closeDrawer();
    });

    document.getElementById('view-project-btn').addEventListener('click', () => {
        closeDrawer();
        window.location.hash = `#/project/${projectId}`;
    });

    // Save status update
    document.getElementById('save-status-btn').addEventListener('click', async () => {
        const newStatus = document.getElementById('status-select').value;
        const comment = document.getElementById('status-comment').value;
        const saveBtn = document.getElementById('save-status-btn');
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            if (!milestoneData?.id) {
                throw new Error('Milestone ID not found');
            }
            
            const { updateMilestone } = await import('../services/api.js');
            
            // Map status string to enum integer value
            const statusMap = {
                'NotStarted': 1,
                'InProgress': 2,
                'PendingReview': 3,
                'Completed': 4,
                'Blocked': 5
            };
            
            // Backend expects: UpdateMilestoneRequest with exact property names
            const updateData = {
                DueDate: null,
                Status: statusMap[newStatus],  // Send as integer
                AssignedUserIds: null,
                BlockedFlag: null,
                FailedCheckFlag: null,
                Notes: comment || null
            };
            
            console.log('Sending update:', updateData);
            
            await updateMilestone({
                milestoneId: milestoneData.id,
                data: updateData
            });
            
            showToast('Status updated successfully', 'success');
            closeDrawer();
            
            // Refresh the grid
            await loadProjectsGrid();
        } catch (error) {
            showToast('Failed to update status: ' + error.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Status Update';
        }
    });

    // Upload document
    document.getElementById('upload-document-btn').addEventListener('click', () => {
        closeDrawer();
        showDocumentUploadModal({ projectId, milestoneId: milestoneData?.id, milestoneName });
    });
}

async function showDocumentUploadModal({ projectId, milestoneId, milestoneName }) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Upload Document</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <p class="text-muted">Upload document for: <strong>${escapeHtml(milestoneName)}</strong></p>
                
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
    
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const docType = document.getElementById('doc-type').value;
        const docFile = document.getElementById('doc-file').files[0];
        const docNotes = document.getElementById('doc-notes').value;
        const errorDiv = document.getElementById('upload-error');
        const uploadBtn = document.getElementById('upload-btn');
        
        if (!docType || !docFile) {
            errorDiv.textContent = 'Please select document type and file';
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
            // Create a simple document record via API
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
            
            // Refresh the grid
            await loadProjectsGrid();
        } catch (error) {
            errorDiv.textContent = 'Upload failed: ' + error.message;
            errorDiv.style.display = 'block';
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
        }
    });
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

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
