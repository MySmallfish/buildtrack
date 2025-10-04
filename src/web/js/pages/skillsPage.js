import { fetchSkills, createSkill, updateSkill } from '../services/api.js';

export async function renderSkillsPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Settings</span>
                <span class="breadcrumb-separator">/</span>
                <span>Skills</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Skills</h1>
                    <p class="text-muted">Manage team member skills and competencies</p>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="add-skill-btn">+ Add Skill</button>
                </div>
            </div>
            
            <div id="skills-list" class="loading">
                <p>Loading skills...</p>
            </div>
        </div>
    `;

    document.getElementById('add-skill-btn').addEventListener('click', () => {
        showAddSkillModal();
    });

    await loadSkills();
}

async function loadSkills() {
    const listContainer = document.getElementById('skills-list');
    
    try {
        const skills = await fetchSkills();
        
        if (skills.length === 0) {
            listContainer.className = 'empty-state';
            listContainer.innerHTML = `
                <h3>No skills yet</h3>
                <p>Add skills to categorize team member competencies</p>
            `;
            return;
        }

        listContainer.className = 'skills-grid';
        listContainer.innerHTML = skills.map(skill => `
            <div class="skill-card ${!skill.active ? 'inactive' : ''}">
                <div class="skill-header">
                    <h3>${escapeHtml(skill.name)}</h3>
                    <span class="status-badge ${skill.active ? 'status-active' : 'status-archived'}">
                        ${skill.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                ${skill.description ? `
                    <p class="skill-description">${escapeHtml(skill.description)}</p>
                ` : ''}
                <div class="skill-footer">
                    <button class="btn btn-sm" onclick="window.toggleSkillStatus('${skill.id}', ${skill.active})">
                        ${skill.active ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `).join('');

        window.currentSkills = skills;
    } catch (error) {
        console.error('Error loading skills:', error);
        listContainer.className = 'empty-state';
        listContainer.innerHTML = `
            <h3>Unable to load skills</h3>
            <p>${error.message}</p>
        `;
    }
}

async function showAddSkillModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add Skill</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-skill-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="skill-name">Name *</label>
                        <input type="text" id="skill-name" name="name" class="form-control" required 
                            placeholder="e.g., Electrical, Plumbing, Carpentry">
                    </div>
                    <div class="form-group">
                        <label for="skill-description">Description</label>
                        <textarea id="skill-description" name="description" class="form-control" rows="3"
                            placeholder="Optional description"></textarea>
                    </div>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Skill</button>
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

    document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
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
                description: formData.get('description') || null
            };

            await createSkill(data);
            
            closeModal();
            showToast('Skill added successfully!', 'success');
            await loadSkills();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Skill';
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

window.toggleSkillStatus = async (skillId, currentlyActive) => {
    try {
        await updateSkill({ 
            skillId, 
            data: { active: !currentlyActive } 
        });
        showToast(`Skill ${currentlyActive ? 'deactivated' : 'activated'} successfully!`, 'success');
        await loadSkills();
    } catch (error) {
        showToast('Failed to update skill: ' + error.message, 'error');
    }
};
