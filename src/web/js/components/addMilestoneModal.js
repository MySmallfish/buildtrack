import { addCustomMilestone, fetchMilestoneTypes } from '../services/api.js';

export async function showAddMilestoneModal(project) {
    const milestoneTypes = await fetchMilestoneTypes();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'add-milestone-modal';
    
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Add Custom Milestone</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="add-milestone-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="milestone-name">Milestone Name *</label>
                        <input type="text" id="milestone-name" name="name" class="form-control" required
                            placeholder="e.g., Foundation Inspection">
                    </div>

                    <div class="form-group">
                        <label for="milestone-type">Milestone Type *</label>
                        <select id="milestone-type" name="milestoneTypeId" class="form-control" required>
                            <option value="">Select type...</option>
                            ${milestoneTypes.map(type => `
                                <option value="${type.id}">${escapeHtml(type.name)}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Due Date</label>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="dateType" value="offset" checked>
                                <span>Days from project start (T + X days)</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="dateType" value="absolute">
                                <span>Specific date</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group" id="offset-input-group">
                        <label for="due-offset">Days from Start *</label>
                        <input type="number" id="due-offset" name="dueOffsetDays" class="form-control" 
                            value="30" min="0" placeholder="e.g., 30">
                        <small>Project starts on ${new Date(project.startDate).toLocaleDateString()}, 
                            so this milestone will be due on <strong id="calculated-date">${calculateDate(project.startDate, 30)}</strong></small>
                    </div>

                    <div class="form-group" id="absolute-input-group" style="display: none;">
                        <label for="absolute-date">Due Date *</label>
                        <input type="date" id="absolute-date" name="absoluteDueDate" class="form-control">
                    </div>

                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Milestone</button>
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

    // Handle date type toggle
    const dateTypeRadios = document.querySelectorAll('input[name="dateType"]');
    const offsetGroup = document.getElementById('offset-input-group');
    const absoluteGroup = document.getElementById('absolute-input-group');
    
    dateTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'offset') {
                offsetGroup.style.display = 'block';
                absoluteGroup.style.display = 'none';
                document.getElementById('due-offset').required = true;
                document.getElementById('absolute-date').required = false;
            } else {
                offsetGroup.style.display = 'none';
                absoluteGroup.style.display = 'block';
                document.getElementById('due-offset').required = false;
                document.getElementById('absolute-date').required = true;
            }
        });
    });

    // Update calculated date when offset changes
    document.getElementById('due-offset').addEventListener('input', (e) => {
        const days = parseInt(e.target.value) || 0;
        document.getElementById('calculated-date').textContent = calculateDate(project.startDate, days);
    });

    document.getElementById('add-milestone-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const dateType = formData.get('dateType');

            const data = {
                projectId: project.id,
                name: formData.get('name'),
                milestoneTypeId: formData.get('milestoneTypeId'),
                dueOffsetDays: dateType === 'offset' ? parseInt(formData.get('dueOffsetDays')) : 0,
                absoluteDueDate: dateType === 'absolute' ? formData.get('absoluteDueDate') : null
            };

            await addCustomMilestone(data);
            
            closeModal();
            showToast('Milestone added successfully!', 'success');
            
            // Reload the page to show the new milestone
            window.location.reload();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Milestone';
        }
    });
}

function calculateDate(startDate, offsetDays) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString();
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
