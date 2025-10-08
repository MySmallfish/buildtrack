import { fetchProjects } from '../services/api.js';

export async function renderArchivedProjectsPage(container) {
    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Archived Projects</h1>
            </div>
            <div id="grid-content" class="loading">
                <p>Loading archived projects...</p>
            </div>
        </div>
    `;

    await loadArchivedProjects();
}

async function loadArchivedProjects() {
    const gridContent = document.getElementById('grid-content');
    
    try {
        gridContent.className = 'loading';
        gridContent.innerHTML = '<p>Loading archived projects...</p>';

        // Fetch archived projects
        const data = await fetchProjects({ filters: { status: 'Archived' } });
        
        if (!data.rows || data.rows.length === 0) {
            gridContent.className = 'empty-state';
            gridContent.innerHTML = `
                <h3>No archived projects</h3>
                <p>Archived projects will appear here</p>
            `;
            return;
        }

        renderArchivedProjectsTable(data.rows, gridContent);
    } catch (error) {
        console.error('Error loading archived projects:', error);
        gridContent.className = 'empty-state';
        gridContent.innerHTML = `
            <h3>Unable to load archived projects</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        `;
    }
}

function renderArchivedProjectsTable(projects, container) {
    container.className = 'grid-table-wrapper';
    
    const tableHTML = `
        <table class="grid-table">
            <thead>
                <tr>
                    <th class="sticky-col">Code</th>
                    <th class="sticky-col">Project Name</th>
                    <th>Type</th>
                    <th>Owner</th>
                    <th>Archived Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(project => renderArchivedProjectRow(project)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;

    // Attach event listeners
    projects.forEach(project => {
        const restoreBtn = document.getElementById(`restore-${project.id}`);
        if (restoreBtn) {
            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await showRestoreConfirmation(project);
            });
        }
    });
}

function renderArchivedProjectRow(project) {
    const archivedDate = project.archivedAt 
        ? new Date(project.archivedAt).toLocaleDateString()
        : '-';

    return `
        <tr data-project-id="${project.id}" class="project-row">
            <td class="sticky-col"><strong>${escapeHtml(project.code)}</strong></td>
            <td class="sticky-col">${escapeHtml(project.name)}</td>
            <td>${escapeHtml(project.projectType)}</td>
            <td>${escapeHtml(project.owner)}</td>
            <td>${archivedDate}</td>
            <td>
                <button class="btn btn-sm" id="restore-${project.id}" title="Restore Project">
                    Restore
                </button>
            </td>
        </tr>
    `;
}

async function showRestoreConfirmation(project) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-small">
            <div class="modal-header">
                <h3>Restore Project</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to restore <strong>${escapeHtml(project.name)}</strong>?</p>
                <p class="text-muted">The project will be moved back to Active Projects.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" id="cancel-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="restore-btn">Restore Project</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    document.getElementById('restore-btn').addEventListener('click', async () => {
        try {
            const restoreBtn = document.getElementById('restore-btn');
            restoreBtn.disabled = true;
            restoreBtn.textContent = 'Restoring...';
            
            // Call API to restore project
            const { restoreProject } = await import('../services/api.js');
            await restoreProject(project.id);
            
            closeModal();
            showToast('Project restored successfully', 'success');
            
            // Reload the grid
            await loadArchivedProjects();
        } catch (error) {
            showToast('Failed to restore project: ' + error.message, 'error');
            const restoreBtn = document.getElementById('restore-btn');
            restoreBtn.disabled = false;
            restoreBtn.textContent = 'Restore Project';
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
