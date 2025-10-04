export async function renderRolesPermissionsPage(container) {
    container.innerHTML = `
        <div class="admin-page">
            <nav class="breadcrumb">
                <a href="#/">Home</a>
                <span class="breadcrumb-separator">/</span>
                <span>Team</span>
                <span class="breadcrumb-separator">/</span>
                <span>Roles & Permissions</span>
            </nav>
            
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Roles & Permissions</h1>
                    <p class="text-muted">System roles and their access levels</p>
                </div>
            </div>
            <div class="roles-container">
                ${renderRoleCard('Admin', 'Full system access', [
                    'Manage all projects',
                    'Create and edit users',
                    'Configure project types and templates',
                    'View all documents and approvals',
                    'Configure automations',
                    'Access analytics and reports'
                ])}
                ${renderRoleCard('Project Manager', 'Project and team management', [
                    'Create and manage projects',
                    'Assign team members to milestones',
                    'Approve/reject documents',
                    'Update milestone status',
                    'Add timeline comments',
                    'View project analytics',
                    'Configure project-level automations'
                ])}
                ${renderRoleCard('Contributor', 'Task execution', [
                    'View assigned milestones',
                    'Upload documents for requirements',
                    'Add comments to assigned milestones',
                    'View project timeline',
                    'Update task status (assigned only)',
                    'Receive notifications'
                ])}
            </div>
            
            <div class="permissions-matrix">
                <h2>Permissions Matrix</h2>
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            <th>Admin</th>
                            <th>Project Manager</th>
                            <th>Contributor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderPermissionRow('Create Projects', true, true, false)}
                        ${renderPermissionRow('Edit Projects', true, true, false)}
                        ${renderPermissionRow('Delete Projects', true, false, false)}
                        ${renderPermissionRow('Create Users', true, false, false)}
                        ${renderPermissionRow('Edit Users', true, false, false)}
                        ${renderPermissionRow('Assign Milestones', true, true, false)}
                        ${renderPermissionRow('Upload Documents', true, true, true)}
                        ${renderPermissionRow('Approve Documents', true, true, false)}
                        ${renderPermissionRow('Reject Documents', true, true, false)}
                        ${renderPermissionRow('Update Milestone Status', true, true, false)}
                        ${renderPermissionRow('Add Comments', true, true, true)}
                        ${renderPermissionRow('Configure Automations', true, true, false)}
                        ${renderPermissionRow('Manage Project Types', true, false, false)}
                        ${renderPermissionRow('Manage Templates', true, false, false)}
                        ${renderPermissionRow('View Analytics', true, true, false)}
                        ${renderPermissionRow('Export Data', true, true, false)}
                    </tbody>
                </table>
            </div>

            <div class="role-notes">
                <h3>Role Assignment Notes</h3>
                <ul>
                    <li><strong>Admin:</strong> Typically assigned to workspace owners and IT administrators</li>
                    <li><strong>Project Manager:</strong> Assigned to project leads, supervisors, and coordinators</li>
                    <li><strong>Contributor:</strong> Assigned to contractors, subcontractors, and field workers</li>
                </ul>
                <p class="text-muted">Roles are assigned when creating or editing users in the Team Members page.</p>
            </div>
        </div>
    `;
}

function renderRoleCard(name, description, permissions) {
    return `
        <div class="role-card">
            <div class="role-header">
                <h3>${name}</h3>
                <p class="role-description">${description}</p>
            </div>
            <div class="role-permissions">
                <h4>Permissions</h4>
                <ul class="permissions-list">
                    ${permissions.map(p => `<li>✓ ${p}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderPermissionRow(feature, admin, pm, contributor) {
    return `
        <tr>
            <td>${feature}</td>
            <td class="permission-cell">${admin ? '<span class="permission-yes">✓</span>' : '<span class="permission-no">✗</span>'}</td>
            <td class="permission-cell">${pm ? '<span class="permission-yes">✓</span>' : '<span class="permission-no">✗</span>'}</td>
            <td class="permission-cell">${contributor ? '<span class="permission-yes">✓</span>' : '<span class="permission-no">✗</span>'}</td>
        </tr>
    `;
}
