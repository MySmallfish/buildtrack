export function renderGrid(projects, onCellClick) {
    if (!projects || projects.length === 0) {
        return `
            <div class="empty-state">
                <h3>No projects yet</h3>
                <p>Create your first project to get started</p>
            </div>
        `;
    }

    // Get all unique milestones across projects
    const allMilestones = new Set();
    projects.forEach(project => {
        if (project.milestones) {
            project.milestones.forEach(m => allMilestones.add(m.name));
        }
    });

    const milestoneColumns = Array.from(allMilestones);

    const headerRow = `
        <tr>
            <th class="sticky-col">Code</th>
            <th class="sticky-col">Project Name</th>
            <th>Type</th>
            <th>Owner</th>
            ${milestoneColumns.map(m => `<th class="milestone-header">${m}</th>`).join('')}
            <th>Status</th>
        </tr>
    `;

    const bodyRows = projects.map(project => {
        const milestoneCells = milestoneColumns.map(milestoneName => {
            const milestone = project.milestones?.find(m => m.name === milestoneName);
            
            if (!milestone) {
                return '<td class="milestone-cell transparent">-</td>';
            }

            const cellClass = getMilestoneCellClass(milestone);
            const cellContent = getMilestoneCellContent(milestone);
            
            return `
                <td class="milestone-cell ${cellClass}" 
                    data-project-id="${project.id}" 
                    data-milestone-id="${milestone.id}"
                    onclick="window.handleCellClick('${project.id}', '${milestone.id}')">
                    ${cellContent}
                </td>
            `;
        }).join('');

        return `
            <tr>
                <td class="sticky-col"><strong>${project.code}</strong></td>
                <td class="sticky-col">${project.name}</td>
                <td>${project.projectType}</td>
                <td>${project.owner}</td>
                ${milestoneCells}
                <td><span class="status-badge status-${project.status.toLowerCase()}">${project.status}</span></td>
            </tr>
        `;
    }).join('');

    return `
        <table class="grid-table">
            <thead>${headerRow}</thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
}

function getMilestoneCellClass(milestone) {
    if (milestone.status === 'Completed') {
        return 'completed';
    }
    
    const dueDate = new Date(milestone.dueDate);
    const now = new Date();
    
    if (dueDate < now && milestone.status !== 'Completed') {
        return 'overdue';
    }
    
    if (milestone.status === 'InProgress') {
        return 'in-progress';
    }
    
    if (milestone.blockedFlag) {
        return 'blocked';
    }
    
    return 'pending';
}

function getMilestoneCellContent(milestone) {
    const dueDate = new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const progress = milestone.requirementsTotal > 0 
        ? `${milestone.requirementsCompleted}/${milestone.requirementsTotal}`
        : '-';
    
    let icon = '○';
    if (milestone.status === 'Completed') icon = '✓';
    else if (milestone.blockedFlag) icon = '⚠';
    else if (milestone.status === 'InProgress') icon = '◐';
    
    return `
        <div class="milestone-cell-content">
            <span class="milestone-icon">${icon}</span>
            <span class="milestone-due">${dueDate}</span>
            <span class="milestone-progress">${progress}</span>
        </div>
    `;
}
