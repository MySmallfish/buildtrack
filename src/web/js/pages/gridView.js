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

    // Load initial data
    await loadGrid({});
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
                if (!e.target.closest('button')) {
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
                <button class="btn-icon" id="view-${project.id}" title="View Details">
                    <span>👁️</span>
                </button>
            </td>
        </tr>
    `;
}
function openProjectDetails(projectId) {
    // Navigate to project details page
    window.location.hash = `#/projects/${projectId}`;
}

async function showNewProjectModal() {
    const { showNewProjectModal: showModal } = await import('../components/newProjectModal.js');
    await showModal();
}

// Export for global access
window.showNewProjectModal = showNewProjectModal;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
