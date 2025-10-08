import { fetchProjects } from '../services/api.js';

export async function renderGridView(container) {
    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Projects Overview</h1>
                <div class="grid-actions">
                    <button class="btn btn-primary" id="new-project-btn">
                        + New Project
                    </button>
                </div>
            </div>
            <div class="grid-filters">
                <select id="status-filter" class="form-control">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="OnHold">On Hold</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>
            <div id="grid-content" class="loading">
                <p>Loading projects...</p>
            </div>
        </div>
    `;

    // Setup event listeners
    document.getElementById('new-project-btn')?.addEventListener('click', () => {
        showNewProjectModal();
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        loadGrid({ status: e.target.value });
    });

    // Load initial data - show only Active projects by default
    await loadGrid({ status: 'Active' });
    
    // Listen for project created event to refresh grid
    window.addEventListener('project-created', async () => {
        const statusFilter = document.getElementById('status-filter');
        await loadGrid({ status: statusFilter?.value || 'Active' });
    });
}

async function loadGrid({ status = null } = {}) {
    const gridContent = document.getElementById('grid-content');
    
    try {
        gridContent.className = 'loading';
        gridContent.innerHTML = '<p>Loading projects...</p>';

        const filters = {};
        if (status) filters.status = status;

        const data = await fetchProjects({ filters });
        
        if (!data.rows || data.rows.length === 0) {
            gridContent.className = 'empty-state';
            gridContent.innerHTML = `
                <h3>No projects found</h3>
                <p>Create your first project to get started</p>
                <button class="btn btn-primary" onclick="window.showNewProjectModal()">
                    + Create Project
                </button>
            `;
            return;
        }

        renderProjectsTable(data.rows, gridContent);
    } catch (error) {
        console.error('Error loading grid:', error);
        gridContent.className = 'empty-state';
        gridContent.innerHTML = `
            <h3>Unable to load projects</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        `;
    }
}

function renderProjectsTable(projects, container) {
    container.className = 'grid-table-wrapper';
    
    const tableHTML = `
        <table class="grid-table">
            <thead>
                <tr>
                    <th class="sticky-col">Code</th>
                    <th class="sticky-col">Project Name</th>
                    <th>Type</th>
                    <th>Owner</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Next Due</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(project => renderProjectRow(project)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;

    // Attach event listeners
    projects.forEach(project => {
        const row = document.querySelector(`[data-project-id="${project.id}"]`);
        if (row) {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('.dropdown')) {
                    openProjectDetails(project.id);
                }
            });
        }

        const viewBtn = document.getElementById(`view-${project.id}`);
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openProjectDetails(project.id);
            });
        }

        // Setup dropdown menu
        const actionsBtn = document.getElementById(`actions-${project.id}`);
        const menu = document.getElementById(`menu-${project.id}`);
        
        if (actionsBtn && menu) {
            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other menus
                document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                menu.classList.toggle('show');
            });

            // Handle menu actions
            menu.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    menu.classList.remove('show');
                    
                    const action = btn.dataset.action;
                    const projectId = btn.dataset.projectId;
                    
                    if (action === 'edit') {
                        await showEditProjectModal(project);
                    } else if (action === 'archive') {
                        await showArchiveConfirmation(project);
                    }
                });
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(m => {
            m.classList.remove('show');
        });
    });
}

function renderProjectRow(project) {
    const progressPercent = project.totalMilestones > 0 
        ? Math.round((project.completedMilestones / project.totalMilestones) * 100)
        : 0;

    const statusClass = `status-${project.status.toLowerCase()}`;
    const nextDueFormatted = project.nextDue 
        ? new Date(project.nextDue).toLocaleDateString()
        : '-';

    return `
        <tr data-project-id="${project.id}" class="project-row">
            <td class="sticky-col"><strong>${escapeHtml(project.code)}</strong></td>
            <td class="sticky-col">${escapeHtml(project.name)}</td>
            <td>${escapeHtml(project.projectType)}</td>
            <td>${escapeHtml(project.owner)}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${project.completedMilestones}/${project.totalMilestones}</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${project.status}</span></td>
            <td>${nextDueFormatted}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" id="view-${project.id}" title="View Details">
                        <span>👁️</span>
                    </button>
                    <div class="dropdown">
                        <button class="btn-icon" id="actions-${project.id}" title="Actions">
                            <span>⋮</span>
                        </button>
                        <div class="dropdown-menu" id="menu-${project.id}">
                            <button class="dropdown-item" data-action="edit" data-project-id="${project.id}">
                                <span>✏️</span> Edit
                            </button>
                            <button class="dropdown-item danger" data-action="archive" data-project-id="${project.id}">
                                <span>📦</span> Archive
                            </button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `;
}
function openProjectDetails(projectId) {
    // Navigate to project details page
    window.location.hash = `#/project/${projectId}`;
}

async function showNewProjectModal() {
    const { showNewProjectModal: showModal } = await import('../components/newProjectModal.js');
    await showModal();
}

// Export for global access
window.showNewProjectModal = showNewProjectModal;

async function showEditProjectModal(project) {
    const { showEditProjectModal: showModal } = await import('../components/editProjectModal.js');
    await showModal(project);
}

async function showArchiveConfirmation(project) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-small">
            <div class="modal-header">
                <h3>Archive Project</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to archive <strong>${escapeHtml(project.name)}</strong>?</p>
                <p class="text-muted">Archived projects can be restored later from the Archived Projects view.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="cancel-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="archive-btn">Archive Project</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    document.getElementById('archive-btn').addEventListener('click', async () => {
        try {
            const archiveBtn = document.getElementById('archive-btn');
            archiveBtn.disabled = true;
            archiveBtn.textContent = 'Archiving...';
            
            // Call API to archive project
            const { archiveProject } = await import('../services/api.js');
            await archiveProject(project.id);
            
            closeModal();
            showToast('Project archived successfully', 'success');
            
            // Reload the grid to remove archived project
            await loadGrid({});
        } catch (error) {
            showToast('Failed to archive project: ' + error.message, 'error');
            const archiveBtn = document.getElementById('archive-btn');
            archiveBtn.disabled = false;
            archiveBtn.textContent = 'Archive Project';
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
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
