import { addMilestoneUpdate, getUploadUrl, confirmUpload } from '../services/api.js';

export async function showMilestoneUpdateModal(milestone, projectId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'milestone-update-modal';
    
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>Add Update to ${escapeHtml(milestone.name)}</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <form id="milestone-update-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="update-comment">Comment / Update *</label>
                        <textarea id="update-comment" name="comment" class="form-control" rows="4" required
                            placeholder="Describe the progress, issues, or changes..."></textarea>
                    </div>

                    <div class="form-group">
                        <label for="update-status">Change Status (Optional)</label>
                        <select id="update-status" name="status" class="form-control">
                            <option value="">Keep current status (${milestone.status})</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Failed">Failed</option>
                            <option value="OnHold">On Hold</option>
                        </select>
                        <small>Leave empty to keep the current status</small>
                    </div>

                    <div class="form-group">
                        <label for="update-document">Attach Document (Optional)</label>
                        <input type="file" id="update-document" name="document" class="form-control">
                        <small>Upload a document related to this update</small>
                        <div id="upload-progress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                            </div>
                            <span id="progress-text">Uploading...</span>
                        </div>
                    </div>

                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-btn">Add Update</button>
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

    document.getElementById('milestone-update-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(e.target);
            const comment = formData.get('comment');
            const status = formData.get('status');
            const file = formData.get('document');

            let documentId = null;

            // Upload document if provided
            if (file && file.size > 0) {
                documentId = await uploadDocument(file, milestone.id);
            }

            // Add the update
            await addMilestoneUpdate({
                milestoneId: milestone.id,
                comment,
                newStatus: status || null,
                documentId
            });
            
            closeModal();
            showToast('Update added successfully!', 'success');
            
            // Reload the page to show the update
            window.location.reload();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Update';
        }
    });
}

async function uploadDocument(file, milestoneId) {
    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressDiv.style.display = 'block';

    try {
        // Get upload URL (you'll need to get the requirement ID)
        // For now, we'll skip the actual upload and return null
        // In a full implementation, you'd need to:
        // 1. Get the requirement ID for this milestone
        // 2. Get pre-signed URL
        // 3. Upload to S3
        // 4. Confirm upload
        
        progressText.textContent = 'Upload feature coming soon...';
        return null;
    } catch (error) {
        progressDiv.style.display = 'none';
        throw new Error('Document upload failed: ' + error.message);
    }
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
