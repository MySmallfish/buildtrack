import { fetchProjects } from '../services/api.js';

export async function renderCalendarView(container) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    container.innerHTML = `
        <div class="calendar-container">
            <div class="calendar-header">
                <h1>Calendar</h1>
                <div class="calendar-controls">
                    <button class="btn-icon" id="prev-month">←</button>
                    <h2 id="current-month">${getMonthName(currentMonth)} ${currentYear}</h2>
                    <button class="btn-icon" id="next-month">→</button>
                    <button class="btn" id="today-btn">Today</button>
                </div>
            </div>
            <div class="calendar-legend">
                <span class="legend-title">Status:</span>
                <span class="legend-item"><span class="legend-dot event-completed"></span> Completed</span>
                <span class="legend-item"><span class="legend-dot event-in-progress"></span> In Progress</span>
                <span class="legend-item"><span class="legend-dot event-overdue"></span> Overdue</span>
                <span class="legend-item"><span class="legend-dot event-blocked"></span> Blocked</span>
                <span class="legend-item"><span class="legend-dot event-failed"></span> Failed</span>
                <span class="legend-item"><span class="legend-dot event-pending"></span> Pending Review</span>
                <span class="legend-item"><span class="legend-dot event-not-started"></span> Not Started</span>
            </div>
            <div id="calendar-grid" class="loading">
                <p>Loading calendar...</p>
            </div>
        </div>
    `;

    let displayMonth = currentMonth;
    let displayYear = currentYear;

    const renderCalendar = async () => {
        await loadCalendar(displayMonth, displayYear);
    };

    document.getElementById('prev-month').addEventListener('click', () => {
        displayMonth--;
        if (displayMonth < 0) {
            displayMonth = 11;
            displayYear--;
        }
        document.getElementById('current-month').textContent = `${getMonthName(displayMonth)} ${displayYear}`;
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        displayMonth++;
        if (displayMonth > 11) {
            displayMonth = 0;
            displayYear++;
        }
        document.getElementById('current-month').textContent = `${getMonthName(displayMonth)} ${displayYear}`;
        renderCalendar();
    });

    document.getElementById('today-btn').addEventListener('click', () => {
        displayMonth = currentMonth;
        displayYear = currentYear;
        document.getElementById('current-month').textContent = `${getMonthName(displayMonth)} ${displayYear}`;
        renderCalendar();
    });

    await renderCalendar();
}

async function loadCalendar(month, year) {
    const gridContainer = document.getElementById('calendar-grid');
    
    try {
        // Fetch all active projects
        const data = await fetchProjects({ filters: { status: 'Active' } });
        const projects = data.rows || [];

        // Fetch detailed project data with milestones for each project
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

        // Extract all milestones with due dates and project info
        const milestones = [];
        for (const project of projectsWithMilestones) {
            if (project.milestones && project.milestones.length > 0) {
                project.milestones.forEach(milestone => {
                    milestones.push({
                        ...milestone,
                        projectName: project.name,
                        projectId: project.id
                    });
                });
            }
        }

        gridContainer.className = 'calendar-grid';
        gridContainer.innerHTML = renderCalendarGrid(month, year, milestones);
        
        // Add click handlers for milestone events
        attachEventHandlers();
    } catch (error) {
        console.error('Error loading calendar:', error);
        gridContainer.className = 'empty-state';
        gridContainer.innerHTML = `
            <h3>Unable to load calendar</h3>
            <p>${error.message}</p>
        `;
    }
}

function renderCalendarGrid(month, year, milestones) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = '<div class="calendar-weekdays">';
    weekDays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    html += '</div><div class="calendar-days">';

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        
        const dayMilestones = milestones.filter(m => {
            const dueDate = new Date(m.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === date.getTime();
        });

        // Sort milestones by status priority (overdue/blocked first)
        dayMilestones.sort((a, b) => {
            const priorityA = getMilestonePriority(a, date);
            const priorityB = getMilestonePriority(b, date);
            return priorityB - priorityA;
        });

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" data-date="${date.toISOString()}">
                <div class="day-number">${day}</div>
                ${dayMilestones.length > 0 ? `
                    <div class="day-events">
                        ${dayMilestones.slice(0, 3).map(m => {
                            const statusClass = getMilestoneStatusClass(m, date);
                            const statusIcon = getMilestoneStatusIcon(m, date);
                            return `
                            <div class="day-event ${statusClass}" 
                                 data-milestone-id="${m.id}" 
                                 data-project-id="${m.projectId}"
                                 title="${escapeHtml(m.projectName)} - ${escapeHtml(m.name)}">
                                <span class="event-icon">${statusIcon}</span>
                                <span class="event-text">${escapeHtml(m.name)}</span>
                            </div>
                        `}).join('')}
                        ${dayMilestones.length > 3 ? `
                            <div class="day-event-more" data-date="${date.toISOString()}">
                                +${dayMilestones.length - 3} more
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
}

function getMilestoneStatusClass(milestone, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(milestone.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (milestone.status === 'Completed') {
        return 'event-completed';
    } else if (milestone.blockedFlag) {
        return 'event-blocked';
    } else if (milestone.failedCheckFlag) {
        return 'event-failed';
    } else if (dueDate < today && milestone.status !== 'Completed') {
        return 'event-overdue';
    } else if (milestone.status === 'InProgress') {
        return 'event-in-progress';
    } else if (milestone.status === 'PendingReview') {
        return 'event-pending';
    }
    return 'event-not-started';
}

function getMilestoneStatusIcon(milestone, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(milestone.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (milestone.status === 'Completed') {
        return '✓';
    } else if (milestone.blockedFlag) {
        return '🚫';
    } else if (milestone.failedCheckFlag) {
        return '❌';
    } else if (dueDate < today && milestone.status !== 'Completed') {
        return '⚠️';
    } else if (milestone.status === 'InProgress') {
        return '▶';
    } else if (milestone.status === 'PendingReview') {
        return '👁';
    }
    return '○';
}

function getMilestonePriority(milestone, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(milestone.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (milestone.blockedFlag) return 5;
    if (milestone.failedCheckFlag) return 4;
    if (dueDate < today && milestone.status !== 'Completed') return 3;
    if (milestone.status === 'InProgress') return 2;
    if (milestone.status === 'Completed') return 1;
    return 0;
}

function attachEventHandlers() {
    // Click handler for milestone events
    document.querySelectorAll('.day-event').forEach(eventEl => {
        if (!eventEl.classList.contains('day-event-more')) {
            eventEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                const milestoneId = eventEl.dataset.milestoneId;
                const projectId = eventEl.dataset.projectId;
                
                if (milestoneId && projectId) {
                    // Navigate to project details
                    window.location.hash = `#/projects/${projectId}`;
                }
            });
        }
    });
    
    // Click handler for "more" events
    document.querySelectorAll('.day-event-more').forEach(moreEl => {
        moreEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const date = moreEl.dataset.date;
            showDayDetailsModal(date);
        });
    });
}

function showDayDetailsModal(dateString) {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Get all milestones for this day
    const dayElement = document.querySelector(`[data-date="${dateString}"]`);
    const allEvents = dayElement?.querySelectorAll('.day-event:not(.day-event-more)');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>${formattedDate}</h3>
                <button class="btn-icon" id="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="day-details-list">
                    ${Array.from(allEvents || []).map(event => {
                        const milestoneId = event.dataset.milestoneId;
                        const projectId = event.dataset.projectId;
                        const title = event.getAttribute('title');
                        const icon = event.querySelector('.event-icon')?.textContent || '○';
                        const statusClass = Array.from(event.classList).find(c => c.startsWith('event-'));
                        
                        return `
                            <div class="milestone-detail-item ${statusClass}" 
                                 data-milestone-id="${milestoneId}" 
                                 data-project-id="${projectId}">
                                <span class="milestone-icon">${icon}</span>
                                <div class="milestone-info">
                                    <div class="milestone-title">${escapeHtml(title)}</div>
                                </div>
                                <button class="btn btn-sm" onclick="window.location.hash='#/projects/${projectId}'">
                                    View Project
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" id="close-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
        document.body.removeChild(modal);
    };
    
    modal.querySelector('#close-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#close-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
