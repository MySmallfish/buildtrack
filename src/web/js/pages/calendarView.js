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
        // Fetch all projects with milestones
        const data = await fetchProjects({});
        const projects = data.rows || [];

        // Extract all milestones with due dates
        const milestones = [];
        for (const project of projects) {
            // In a real implementation, we'd fetch project details to get milestones
            // For now, we'll show a simplified calendar
        }

        gridContainer.className = 'calendar-grid';
        gridContainer.innerHTML = renderCalendarGrid(month, year, milestones);
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
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today && !isToday;
        
        const dayMilestones = milestones.filter(m => {
            const dueDate = new Date(m.dueDate);
            return dueDate.toDateString() === date.toDateString();
        });

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                <div class="day-number">${day}</div>
                ${dayMilestones.length > 0 ? `
                    <div class="day-events">
                        ${dayMilestones.slice(0, 3).map(m => `
                            <div class="day-event" title="${escapeHtml(m.name)}">
                                <span class="event-dot ${m.status.toLowerCase()}"></span>
                                <span class="event-text">${escapeHtml(m.name)}</span>
                            </div>
                        `).join('')}
                        ${dayMilestones.length > 3 ? `
                            <div class="day-event-more">+${dayMilestones.length - 3} more</div>
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
