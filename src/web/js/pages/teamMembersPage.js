import { fetchUsers, fetchSkills, createUser, updateUser } from '../services/api.js';

export async function renderTeamMembersPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Team</span>
                <span class="breadcrumb-separator">/</span>
                <span>Members</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Team Members</h1>
                    <p class="text-muted">Manage users, roles, and permissions</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
                </div>
            </div>
            
            <div id="users-list" class="loading">
                <p>Loading team members...</p>
            </div>
        </div>
    `;

    document.getElementById('add-user-btn').addEventListener('click', () => {
        showAddUserModal();
    });

    await loadUsers();
}

async function loadUsers() {
    const listContainer = document.getElementById('users-list');
    
    try {
        const users = await fetchUsers();
        
        if (users.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No users yet</h3>
                <p>Add your first team member</p>
            `;
            return;
        }

        listContainer.className = 'users-grid';
        listContainer.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-avatar-large">${user.fullName[0].toUpperCase()}</div>
                <h3>${escapeHtml(user.fullName)}</h3>
                <p class="text-muted">${escapeHtml(user.email)}</p>
                <span class="role-badge role-${user.role.toLowerCase()}">${user.role}</span>
                <span class="status-badge ${user.active ? 'status-active' : 'status-archived'}">
                    ${user.active ? 'Active' : 'Inactive'}
                </span>
                ${user.skillIds && user.skillIds.length > 0 ? `
                    <div class="user-skills">
                        <small>${user.skillIds.length} skill(s)</small>
                    </div>
                ` : ''}
                <div class="user-actions">
                    <button class="btn btn-sm" onclick="window.editUser('${user.id}')">Edit</button>
                    <button class="btn btn-sm ${user.active ? 'btn-danger' : ''}" 
                        onclick="window.toggleUserStatus('${user.id}', ${user.active})">
                        ${user.active ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `).join('');

        // Store users globally for actions
        window.currentUsers = users;
    } catch (error) {
        console.error('Error loading users:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load team members</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddUserModal() {
    const skills = await fetchSkills();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Add Team Member</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-user-form">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="user-fullname">Full Name *</label>
                            <input type="text" id="user-fullname" name="fullName" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-email">Email *</label>
                            <input type="email" id="user-email" name="email" class="form-control" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="user-password">Password *</label>
                            <input type="password" id="user-password" name="password" class="form-control" required minlength="8">
                            <small>Min 8 characters, uppercase, digit</small>
                        </div>
                        <div class="form-group">
                            <label for="user-role">Role *</label>
                            <select id="user-role" name="role" class="form-control" required>
                                <option value="">Select role...</option>
                                <option value="Admin">Admin</option>
                                <option value="ProjectManager">Project Manager</option>
                                <option value="Contributor">Contributor</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Skills</label>
                        <div class="checkbox-group">
                            ${skills.filter(s => s.active).map(skill => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="skills" value="${skill.id}">
                                    <span>${escapeHtml(skill.name)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add User</button>
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

    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const skillIds = Array.from(formData.getAll('skills'));

            const data = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                skillIds: skillIds
            };

            await createUser(data);
            
            closeModal();
            showToast('User added successfully!', 'success');
            await loadUsers();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add User';
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

window.editUser = (userId) => {
    showToast('Edit functionality coming soon', 'info');
};

window.toggleUserStatus = async (userId, currentlyActive) => {
    try {
        await updateUser({ 
            userId, 
            data: { active: !currentlyActive } 
        });
        showToast(`User ${currentlyActive ? 'deactivated' : 'activated'} successfully!`, 'success');
        await loadUsers();
    } catch (error) {
        showToast('Failed to update user: ' + error.message, 'error');
    }
};
