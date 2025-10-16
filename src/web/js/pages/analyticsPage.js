import { fetchAnalyticsSummary } from '../services/api.js';

function formatDateLabel(period) {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString(undefined, { month: 'short', year: '2-digit' });
}

function renderMetricCard(title, value, subtitle = '') {
    return `
        <div class="metric-card">
            <div class="metric-title">${title}</div>
            <div class="metric-value">${value}</div>
            ${subtitle ? `<div class="metric-subtitle">${subtitle}</div>` : ''}
        </div>
    `;
}

function renderDistributionItem(label, value, total, colorClass = '') {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return `
        <div class="distribution-item">
            <div class="distribution-label">${label}</div>
            <div class="distribution-bar">
                <div class="distribution-fill ${colorClass}" style="width: ${percent}%"></div>
            </div>
            <div class="distribution-value">${value} <span class="text-muted">(${percent}%)</span></div>
        </div>
    `;
}

function renderTrendChart(trend) {
    if (!trend || trend.length === 0) {
        return '<p class="text-muted" style="text-align: center; padding: 40px 0;">No completed milestones yet</p>';
    }
    
    const maxValue = Math.max(...trend.map(point => point.completed), 1);
    return `
        <div class="chart-container">
            ${trend.map(point => {
                const height = Math.round((point.completed / maxValue) * 100);
                return `
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${Math.max(height, 5)}%">
                            <span class="chart-value">${point.completed}</span>
                        </div>
                        <span class="chart-label">${formatDateLabel(point.period)}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

export async function renderAnalyticsPage(container) {
    container.innerHTML = `
        <div class="analytics-page">
            <div class="page-header">
                <div class="page-header-content">
                    <h1>📊 Analytics Dashboard</h1>
                    <p class="text-muted">Portfolio performance metrics and insights</p>
                </div>
            </div>
            <div class="analytics-loading">
                <div class="spinner"></div>
                <p class="text-muted">Loading analytics...</p>
            </div>
        </div>
    `;

    try {
        const summary = await fetchAnalyticsSummary();
        const { projects, milestones, documents, milestoneCompletionTrend, topProjectManagers } = summary;

        const totalProjects = projects.total || 0;
        const totalMilestones = milestones.total || 0;
        const totalDocuments = documents.total || 0;

        const analyticsHtml = `
            <div class="analytics-page">
                <div class="page-header">
                    <div class="page-header-content">
                        <h1>📊 Analytics Dashboard</h1>
                        <p class="text-muted">Portfolio performance metrics and insights</p>
                    </div>
                </div>

                <!-- Key Metrics -->
                <div class="metrics-grid">
                    ${renderMetricCard('Active Projects', projects.active ?? 0, `${totalProjects} total projects`)}
                    ${renderMetricCard('Completed Milestones', milestones.completed ?? 0, `${milestones.overdue ?? 0} overdue`)}
                    ${renderMetricCard('Approved Documents', documents.approved ?? 0, `${documents.pending ?? 0} pending review`)}
                    ${renderMetricCard('Avg Approval Time', `${Math.round(documents.averageApprovalHours ?? 0)}h`, 'Document turnaround')}
                </div>

                <!-- Analytics Cards Grid -->
                <div class="analytics-grid">
                    <!-- Project Status Distribution -->
                    <section class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Project Status Distribution</h3>
                            <span class="badge">${totalProjects} total</span>
                        </div>
                        <div class="analytics-card-body">
                            ${totalProjects > 0 ? `
                                ${renderDistributionItem('Active', projects.active ?? 0, totalProjects, 'fill-success')}
                                ${renderDistributionItem('On Hold', projects.onHold ?? 0, totalProjects, 'fill-warning')}
                                ${renderDistributionItem('Archived', projects.archived ?? 0, totalProjects, 'fill-gray')}
                            ` : '<p class="text-muted" style="text-align: center; padding: 20px;">No projects yet</p>'}
                        </div>
                    </section>

                    <!-- Milestone Health -->
                    <section class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Milestone Health</h3>
                            <span class="badge">${totalMilestones} total</span>
                        </div>
                        <div class="analytics-card-body">
                            ${totalMilestones > 0 ? `
                                ${renderDistributionItem('Completed', milestones.completed ?? 0, totalMilestones, 'fill-success')}
                                ${renderDistributionItem('In Progress', milestones.inProgress ?? 0, totalMilestones, 'fill-primary')}
                                ${renderDistributionItem('Pending Review', milestones.pendingReview ?? 0, totalMilestones, 'fill-warning')}
                                ${renderDistributionItem('Blocked', milestones.blocked ?? 0, totalMilestones, 'fill-danger')}
                                ${renderDistributionItem('Overdue', milestones.overdue ?? 0, totalMilestones, 'fill-danger')}
                            ` : '<p class="text-muted" style="text-align: center; padding: 20px;">No milestones yet</p>'}
                        </div>
                    </section>

                    <!-- Milestone Completion Trend -->
                    <section class="analytics-card chart-card">
                        <div class="analytics-card-header">
                            <h3>Milestone Completion Trend</h3>
                            <span class="badge">Last 6 months</span>
                        </div>
                        <div class="analytics-card-body">
                            ${renderTrendChart(milestoneCompletionTrend)}
                        </div>
                    </section>

                    <!-- Top Project Managers -->
                    <section class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Top Project Managers</h3>
                            <span class="badge">By milestones completed</span>
                        </div>
                        <div class="analytics-card-body">
                            ${topProjectManagers && topProjectManagers.length > 0 ? `
                                <ul class="pm-list">
                                    ${topProjectManagers.map((pm, index) => `
                                        <li class="pm-item">
                                            <div class="pm-rank">#${index + 1}</div>
                                            <div class="pm-info">
                                                <div class="pm-name">${escapeHtml(pm.ownerName || 'Unassigned')}</div>
                                                <div class="pm-subtitle text-muted">${pm.activeProjects} active project${pm.activeProjects !== 1 ? 's' : ''}</div>
                                            </div>
                                            <div class="pm-metric">
                                                <div class="pm-metric-value">${pm.completedMilestones}</div>
                                                <div class="pm-metric-label">milestones</div>
                                            </div>
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : '<p class="text-muted" style="text-align: center; padding: 20px;">No data available</p>'}
                        </div>
                    </section>
                </div>

                <!-- Document Insights -->
                <section class="analytics-section">
                    <h2>Document Insights</h2>
                    <div class="metrics-grid">
                        ${renderMetricCard('Total Documents', totalDocuments, `${documents.approved ?? 0} approved`)}
                        ${renderMetricCard('Pending Review', documents.pending ?? 0, 'Awaiting approval')}
                        ${renderMetricCard('Rejected', documents.rejected ?? 0, 'Require resubmission')}
                        ${renderMetricCard('Approval Rate', totalDocuments > 0 ? `${Math.round(((documents.approved ?? 0) / totalDocuments) * 100)}%` : '0%', 'Overall success rate')}
                    </div>
                </section>
            </div>
        `;

        container.innerHTML = analyticsHtml;
    } catch (error) {
        console.error('Failed to load analytics summary:', error);
        container.innerHTML = `
            <div class="analytics-page">
                <div class="page-header">
                    <div class="page-header-content">
                        <h1>📊 Analytics Dashboard</h1>
                        <p class="text-muted">Portfolio performance metrics and insights</p>
                    </div>
                </div>
                <div class="error-state">
                    <h3>⚠️ Unable to load analytics</h3>
                    <p class="text-muted">${escapeHtml(error.message || 'Please try again later.')}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            </div>
        `;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
