import { createActor } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import { appMachine } from './machines/appMachine.js';

// Create and start the app actor
const appActor = createActor(appMachine);

appActor.subscribe((snapshot) => {
    console.log('[App State]', snapshot.value, snapshot.context);
    render(snapshot);
});

appActor.start();

// Render function
function render(snapshot) {
    const authView = document.getElementById('auth-view');
    const mainView = document.getElementById('main-view');

    if (snapshot.matches('unauthenticated') || snapshot.matches('authenticating')) {
        authView.style.display = 'flex';
        mainView.style.display = 'none';
        renderAuthView(snapshot);
    } else if (snapshot.matches('authenticated')) {
        authView.style.display = 'none';
        mainView.style.display = 'flex';
        renderMainView(snapshot);
    } else {
        // Boot state - show nothing or loading
        authView.style.display = 'none';
        mainView.style.display = 'none';
    }
}

let authState = 'login'; // 'login', 'signup', 'verify'
let pendingEmail = '';

function renderAuthView(snapshot) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const verifyForm = document.getElementById('verify-form');

    // Show the appropriate form
    loginForm.style.display = authState === 'login' ? 'block' : 'none';
    signupForm.style.display = authState === 'signup' ? 'block' : 'none';
    verifyForm.style.display = authState === 'verify' ? 'block' : 'none';

    // Setup form handlers
    setupLoginForm(snapshot);
    setupSignupForm();
    setupVerifyForm();
    setupAuthSwitchLinks();
}

function setupLoginForm(snapshot) {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Show error if any
    if (snapshot.context.error && authState === 'login') {
        errorDiv.textContent = snapshot.context.error;
        errorDiv.style.display = 'block';
    } else {
        errorDiv.style.display = 'none';
    }

    // Disable form during authentication
    const isAuthenticating = snapshot.matches('authenticating');
    submitBtn.disabled = isAuthenticating;
    submitBtn.textContent = isAuthenticating ? 'Logging in...' : 'Login';

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        
        const formData = new FormData(form);
        appActor.send({
            type: 'LOGIN.SUBMIT',
            email: formData.get('email'),
            password: formData.get('password')
        });
    };
}

function setupSignupForm() {
    const form = document.getElementById('signup-form');
    const errorDiv = document.getElementById('signup-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.onsubmit = async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing up...';

        try {
            const formData = new FormData(form);
            const { register } = await import('./services/api.js');
            
            const response = await register({
                email: formData.get('email'),
                password: formData.get('password'),
                fullName: formData.get('fullName'),
                workspaceName: formData.get('workspaceName')
            });

            // Switch to verification form
            pendingEmail = formData.get('email');
            authState = 'verify';
            document.getElementById('verify-email-display').textContent = pendingEmail;
            renderAuthView(appActor.getSnapshot());
            
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    };
}

function setupVerifyForm() {
    const form = document.getElementById('verify-form');
    const errorDiv = document.getElementById('verify-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.onsubmit = async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            const formData = new FormData(form);
            const { verifyEmail } = await import('./services/api.js');
            
            const response = await verifyEmail({
                email: pendingEmail,
                code: formData.get('code')
            });

            // Verification successful - send login event to state machine
            appActor.send({
                type: 'LOGIN.SUCCESS',
                user: response.user,
                tokens: {
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken
                }
            });
            
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify Email';
        }
    };
}

function setupAuthSwitchLinks() {
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        authState = 'signup';
        renderAuthView(appActor.getSnapshot());
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        authState = 'login';
        renderAuthView(appActor.getSnapshot());
    });

    document.getElementById('back-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        authState = 'login';
        renderAuthView(appActor.getSnapshot());
    });

    document.getElementById('resend-code')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const link = e.target;
        const originalText = link.textContent;
        link.textContent = 'Sending...';

        try {
            const { resendVerificationCode } = await import('./services/api.js');
            await resendVerificationCode({ email: pendingEmail });
            link.textContent = 'Code sent!';
            setTimeout(() => {
                link.textContent = originalText;
            }, 3000);
        } catch (error) {
            alert(error.message);
            link.textContent = originalText;
        }
    });
}

function renderMainView(snapshot) {
    const user = snapshot.context.user;
    
    if (user) {
        // Update user info in sidebar
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        const userAvatar = document.getElementById('user-avatar');

        if (userName) userName.textContent = user.fullName || user.email;
        if (userRole) userRole.textContent = user.role;
        if (userAvatar) userAvatar.textContent = (user.fullName || user.email)[0].toUpperCase();
    }

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.onclick = () => {
        appActor.send({ type: 'AUTH.LOGOUT' });
    };

    // Handle navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const route = link.getAttribute('data-route');
            navigateTo(route);
        };
    });

    // Setup search
    setupSearch();

    // Render initial page
    renderPage('overview');
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('sidebar-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const navLinks = document.querySelectorAll('.nav-link');
        const navSections = document.querySelectorAll('.nav-section');

        if (!query) {
            // Show all
            navLinks.forEach(link => link.style.display = '');
            navSections.forEach(section => section.style.display = '');
            return;
        }

        // Filter links
        navLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes(query)) {
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        });

        // Hide empty sections
        navSections.forEach(section => {
            const visibleLinks = section.querySelectorAll('.nav-link:not([style*="display: none"])');
            if (visibleLinks.length === 0) {
                section.style.display = 'none';
            } else {
                section.style.display = '';
            }
        });
    });
}

function navigateTo(route) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-route="${route}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Render page
    renderPage(route);
}

async function renderPage(route) {
    const container = document.getElementById('page-container');
    
    // Check if route is a project details route
    if (route.startsWith('project-')) {
        const projectId = route.replace('project-', '');
        const { renderProjectDetails } = await import('./pages/projectDetails.js');
        await renderProjectDetails(container, projectId);
        return;
    }
    
    switch (route) {
        case 'overview':
        case 'projectsActive':
            const { renderGridView } = await import('./pages/gridView.js');
            await renderGridView(container);
            break;
        
        case 'documents':
            container.innerHTML = `
                <div class="grid-container">
                    <div class="grid-header">
                        <h1>Documents</h1>
                    </div>
                    <div class="empty-state">
                        <h3>Documents Inbox</h3>
                        <p>Document management coming soon</p>
                    </div>
                </div>
            `;
            break;

        case 'teamMembers':
            const { renderTeamMembersPage } = await import('./pages/teamMembersPage.js');
            await renderTeamMembersPage(container);
            break;

        case 'teamRoles':
            const { renderRolesPermissionsPage } = await import('./pages/rolesPermissionsPage.js');
            await renderRolesPermissionsPage(container);
            break;

        case 'projectTypes':
            const { renderProjectTypesPage } = await import('./pages/projectTypesPage.js');
            await renderProjectTypesPage(container);
            break;

        case 'skills':
            const { renderSkillsPage } = await import('./pages/skillsPage.js');
            await renderSkillsPage(container);
            break;

        case 'templates':
            const { renderTemplatesPage } = await import('./pages/templatesPage.js');
            await renderTemplatesPage(container);
            break;

        case 'milestoneTypes':
            const { renderMilestoneTypesPage } = await import('./pages/milestoneTypesPage.js');
            await renderMilestoneTypesPage(container);
            break;

        case 'documentTypes':
            const { renderDocumentTypesPage } = await import('./pages/documentTypesPage.js');
            await renderDocumentTypesPage(container);
            break;

        case 'messages':
            await renderNotifications(container);
            break;

        case 'calendar':
            const { renderCalendarView } = await import('./pages/calendarView.js');
            await renderCalendarView(container);
            break;

        case 'myAssignments':
            const { renderContributorPortal } = await import('./pages/contributorPortal.js');
            await renderContributorPortal(container);
            break;

        default:
            container.innerHTML = `
                <div class="empty-state">
                    <h3>${route}</h3>
                    <p>This page is under construction</p>
                </div>
            `;
    }
}

async function renderTeamMembers(container) {
    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Team Members</h1>
                <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
            </div>
            <div id="users-list" class="loading">
                <p>Loading team members...</p>
            </div>
        </div>
    `;

    try {
        const { fetchUsers } = await import('./services/api.js');
        const users = await fetchUsers();
        
        const usersList = document.getElementById('users-list');
        usersList.className = 'users-grid';
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-avatar-large">${user.fullName[0].toUpperCase()}</div>
                <h3>${escapeHtml(user.fullName)}</h3>
                <p class="text-muted">${escapeHtml(user.email)}</p>
                <span class="role-badge">${user.role}</span>
                <span class="status-badge ${user.active ? 'status-active' : 'status-archived'}">
                    ${user.active ? 'Active' : 'Inactive'}
                </span>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('users-list').innerHTML = `
            <div class="empty-state">
                <h3>Unable to load team members</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function renderNotifications(container) {
    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Messages & Notifications</h1>
                <button class="btn" id="mark-all-read-btn">Mark All Read</button>
            </div>
            <div id="notifications-list" class="loading">
                <p>Loading notifications...</p>
            </div>
        </div>
    `;

    try {
        const { fetchNotifications, markAllNotificationsAsRead } = await import('./services/api.js');
        const notifications = await fetchNotifications({});
        
        const notifList = document.getElementById('notifications-list');
        notifList.className = 'notifications-list';
        
        if (notifications.length === 0) {
            notifList.innerHTML = '<div class="empty-state"><h3>No notifications</h3></div>';
        } else {
            notifList.innerHTML = notifications.map(notif => `
                <div class="notification-item ${notif.read ? 'read' : 'unread'}">
                    <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
                    <div class="notification-content">
                        <h4>${escapeHtml(notif.title)}</h4>
                        <p>${escapeHtml(notif.body)}</p>
                        <span class="text-muted">${formatRelativeTime(notif.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
            await markAllNotificationsAsRead();
            await renderNotifications(container);
        });
    } catch (error) {
        document.getElementById('notifications-list').innerHTML = `
            <div class="empty-state">
                <h3>Unable to load notifications</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function getNotificationIcon(type) {
    const icons = {
        'Assignment': '📋',
        'DocumentUploaded': '📄',
        'DocumentApproved': '✅',
        'DocumentRejected': '❌',
        'DueSoon': '⏰',
        'MilestoneCompleted': '🎉'
    };
    return icons[type] || '🔔';
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadProjectsGrid() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/projects', {
            headers: {
                'Authorization': `Bearer ${appActor.getSnapshot().context.tokens?.accessToken}`
            }
        });

        if (response.ok) {
            const projects = await response.json();
            renderProjectsGrid(projects);
        } else {
            throw new Error('Failed to load projects');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        document.querySelector('.loading').innerHTML = `
            <div class="empty-state">
                <h3>Unable to load projects</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderProjectsGrid(projects) {
    const container = document.getElementById('page-container');
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="grid-container">
                <div class="grid-header">
                    <h1>Overview</h1>
                    <button class="btn btn-primary" onclick="alert('Create Project - Coming Soon')">
                        + New Project
                    </button>
                </div>
                <div class="empty-state">
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started</p>
                </div>
            </div>
        `;
        return;
    }

    const tableRows = projects.map(project => `
        <tr>
            <td><strong>${project.code}</strong></td>
            <td>${project.name}</td>
            <td>${project.projectType}</td>
            <td>${project.owner}</td>
            <td>${project.completedMilestones}/${project.totalMilestones}</td>
            <td>${project.status}</td>
            <td>${project.nextDue ? new Date(project.nextDue).toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="grid-container">
            <div class="grid-header">
                <h1>Overview</h1>
                <button class="btn btn-primary" onclick="alert('Create Project - Coming Soon')">
                    + New Project
                </button>
            </div>
            <table class="grid-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Project Name</th>
                        <th>Type</th>
                        <th>Owner</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Next Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

async function loadProjectsList() {
    await loadProjectsGrid();
}

// Export for debugging
window.appActor = appActor;
