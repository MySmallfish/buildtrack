Awesome—here are **drop‑in XState v5 machine skeletons** for the BuildTrack MVP (vanilla JS / ES modules).
They include the **app**, **router**, **grid**, **drawer**, **upload**, **approval**, and **automation** machines, plus minimal service placeholders and a bootstrapping `main.js`.

> **Use with CDN or bundler**
>
> * CDN (no build):
>
>   ```html
>   <script type="module">
>     import { setup, createMachine, createActor, assign, fromPromise, sendTo } from 'https://unpkg.com/xstate@5/dist/xstate.web.mjs';
>   </script>
>   ```
> * Bundler: `npm i xstate@^5` and keep the imports as `from 'xstate'`.

---

### `/web/js/services/api.js` — **API stubs (replace with real fetch calls)**

```js
// web/js/services/api.js
// Minimal, promise-based placeholders. Replace with real .NET 9 endpoints.

export async function checkSession() {
  // GET /api/v1/me
  return { user: null }; // or { user, tokens }
}

export async function login({ email, password }) {
  // POST /api/v1/auth/login
  return { user: { id: 'u1', name: 'PM' }, tokens: { access: '...', refresh: '...' } };
}

export async function refreshToken({ refresh }) {
  // POST /api/v1/auth/refresh
  return { access: '...' };
}

export async function fetchGrid({ filters, sort, page }) {
  // GET /api/v1/projects?...
  return { rows: [], columns: [], pageInfo: { page, total: 0 } };
}

export async function fetchProjectSummary({ projectId, milestoneId }) {
  // GET /api/v1/projects/{id}?include=summary
  return { project: { id: projectId }, milestone: { id: milestoneId }, stats: {} };
}

export async function getUploadUrl({ requirementId, fileName, contentType, size, md5 }) {
  // POST /api/v1/requirements/{id}/upload-url
  return { url: 'https://presigned', headers: {}, key: 'uploads/...' };
}

export async function confirmUpload({ requirementId, key, fileName, size, checksum }) {
  // POST /api/v1/documents/confirm
  return { documentId: 'd1', status: 'Pending' };
}

export async function approveDocument({ documentId }) {
  // POST /api/v1/documents/{id}/approve
  return { ok: true };
}

export async function rejectDocument({ documentId, reason }) {
  // POST /api/v1/documents/{id}/reject
  return { ok: true };
}

export async function listAutomations() {
  // GET /api/v1/automations
  return { rules: [] };
}

export async function saveAutomation({ rule }) {
  // POST /api/v1/automations
  return { id: 'r1' };
}

export async function testAutomation({ ruleId, payload }) {
  // POST /api/v1/automations/{id}/test
  return { result: 'ok' };
}
```

---

### `/web/js/machines/appMachine.js` — **Root app/auth + router spawn**

```js
// web/js/machines/appMachine.js
import { setup, createMachine, assign, fromPromise } from 'xstate';
import * as api from '../services/api.js';
import { routerMachine } from './routerMachine.js';

export const appMachine = setup({
  actions: {
    setUser: assign(({ event }) => ({
      user: event.output?.user ?? null,
      tokens: event.output?.tokens ?? null,
      error: null
    })),
    setError: assign(({ event }) => ({ error: event.error })),
    clearUser: assign(() => ({ user: null, tokens: null, error: null }))
  },
  actors: {
    checkSession: fromPromise(api.checkSession),
    login: fromPromise(({ input }) => api.login(input)),
    refresh: fromPromise(({ input }) => api.refreshToken(input)),
    router: routerMachine
  }
}).createMachine({
  id: 'app',
  context: {
    user: null,
    tokens: null,
    error: null
  },
  initial: 'boot',
  states: {
    boot: {
      invoke: {
        src: 'checkSession'
      },
      on: {
        'done.invoke.checkSession': [
          { guard: ({ event }) => !!event.output?.user, target: 'authenticated', actions: 'setUser' },
          { target: 'unauthenticated' }
        ],
        'error.invoke.checkSession': { target: 'unauthenticated' }
      }
    },

    unauthenticated: {
      on: {
        'LOGIN.SUBMIT': { target: 'authenticating' }
      }
    },

    authenticating: {
      invoke: {
        src: 'login',
        input: ({ event }) => ({ email: event.email, password: event.password })
      },
      on: {
        'done.invoke.login': { target: 'authenticated', actions: 'setUser' },
        'error.invoke.login': { target: 'unauthenticated', actions: 'setError' }
      }
    },

    authenticated: {
      invoke: {
        id: 'router',
        src: 'router',
        input: ({ context }) => ({ user: context.user })
      },
      on: {
        'AUTH.LOGOUT': { target: 'unauthenticated', actions: 'clearUser' }
      }
    }
  }
});
```

---

### `/web/js/machines/routerMachine.js` — **URL ↔ route state**

```js
// web/js/machines/routerMachine.js
import { setup, createMachine, assign } from 'xstate';

// Very small router: map pathnames to named states.
const routeTable = [
  { name: 'overview',       match: /^\/$/ },
  { name: 'analytics',      match: /^\/analytics\/?$/ },
  { name: 'teamMembers',    match: /^\/team\/members\/?$/ },
  { name: 'teamRoles',      match: /^\/team\/roles\/?$/ },
  { name: 'projectsActive', match: /^\/projects\/active\/?$/ },
  { name: 'projectsArchived', match: /^\/projects\/archived\/?$/ },
  { name: 'templates',      match: /^\/projects\/templates\/?$/ },
  { name: 'documents',      match: /^\/documents\/?$/ },
  { name: 'calendar',       match: /^\/calendar\/?$/ },
  { name: 'messages',       match: /^\/messages\/?$/ },
  { name: 'projectDetails', match: /^\/projects\/([^/]+)\/?$/ } // param: projectId
];

function resolve(path) {
  for (const r of routeTable) {
    const m = path.match(r.match);
    if (m) return { name: r.name, params: { projectId: m[1] }, path };
  }
  return { name: 'overview', params: {}, path: '/' };
}

export const routerMachine = setup({
  actions: {
    setRoute: assign(({ event }) => ({ route: event.route })),
    pushHistory: ({ context }) => {
      if (location.pathname + location.search + location.hash !== context.route.path) {
        history.pushState({}, '', context.route.path);
      }
    }
  },
  actors: {
    popstateListener: () => (sendBack) => {
      const onPop = () => sendBack({ type: 'ROUTE.POP', path: location.pathname + location.search + location.hash });
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }
}).createMachine({
  id: 'router',
  context: {
    route: resolve(location.pathname + location.search + location.hash)
  },
  initial: 'ready',
  invoke: { src: 'popstateListener' },
  on: {
    'ROUTE.NAVIGATE': {
      actions: [
        assign(({ event }) => ({ route: resolve(event.path) })),
        'pushHistory'
      ]
    },
    'ROUTE.POP': { actions: assign(({ event }) => ({ route: resolve(event.path) })) }
  },
  states: {
    ready: {
      // Useful for parent to branch UI by route name
      tags: ({ context }) => ({ [`route:${context.route.name}`]: true })
    }
  }
});
```

---

### `/web/js/machines/gridMachine.js` — **Projects grid**

```js
// web/js/machines/gridMachine.js
import { setup, createMachine, assign, fromPromise } from 'xstate';
import * as api from '../services/api.js';

export const gridMachine = setup({
  actions: {
    setData: assign(({ event }) => ({
      rows: event.output.rows,
      columns: event.output.columns,
      pageInfo: event.output.pageInfo,
      error: null
    })),
    setError: assign(({ event }) => ({ error: event.error })),
    setFilters: assign(({ event, context }) => ({ filters: { ...context.filters, ...event.patch } })),
    setSort: assign(({ event }) => ({ sort: event.sort })),
    setPage: assign(({ event }) => ({ page: event.page }))
  },
  actors: {
    fetchGrid: fromPromise(({ input }) => api.fetchGrid(input))
  }
}).createMachine({
  id: 'grid',
  context: {
    filters: {},
    sort: { by: 'nextDue', dir: 'asc' },
    page: 1,
    rows: [],
    columns: [],
    pageInfo: { page: 1, total: 0 },
    error: null
  },
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'fetchGrid',
        input: ({ context }) => ({
          filters: context.filters,
          sort: context.sort,
          page: context.page
        })
      },
      on: {
        'done.invoke.fetchGrid': { target: 'ready', actions: 'setData' },
        'error.invoke.fetchGrid': { target: 'error', actions: 'setError' }
      }
    },
    ready: {
      on: {
        'FILTER.CHANGE': { target: 'loading', actions: 'setFilters' },
        'SORT.CHANGE': { target: 'loading', actions: 'setSort' },
        'PAGE.CHANGE': { target: 'loading', actions: 'setPage' },
        'GRID.RELOAD': { target: 'loading' },
        'CELL.CLICK': { }, // parent can intercept or handle
        'CELL.MENU.OPEN': { } // fire UI
      }
    },
    error: {
      on: {
        'GRID.RETRY': { target: 'loading' }
      }
    }
  }
});
```

---

### `/web/js/machines/drawerMachine.js` — **Project summary drawer**

```js
// web/js/machines/drawerMachine.js
import { setup, createMachine, assign, fromPromise } from 'xstate';
import * as api from '../services/api.js';

export const drawerMachine = setup({
  actions: {
    setTarget: assign(({ event }) => ({
      projectId: event.projectId,
      milestoneId: event.milestoneId
    })),
    setSummary: assign(({ event }) => ({ summary: event.output, error: null })),
    setError: assign(({ event }) => ({ error: event.error }))
  },
  actors: {
    fetchSummary: fromPromise(({ input }) => api.fetchProjectSummary(input))
  }
}).createMachine({
  id: 'drawer',
  context: {
    projectId: null,
    milestoneId: null,
    summary: null,
    error: null
  },
  initial: 'closed',
  states: {
    closed: {
      on: {
        'DRAWER.OPEN': { target: 'opening', actions: 'setTarget' }
      }
    },
    opening: {
      invoke: {
        src: 'fetchSummary',
        input: ({ context }) => ({ projectId: context.projectId, milestoneId: context.milestoneId })
      },
      on: {
        'done.invoke.fetchSummary': { target: 'open', actions: 'setSummary' },
        'error.invoke.fetchSummary': { target: 'closed', actions: 'setError' }
      }
    },
    open: {
      on: {
        'DRAWER.CLOSE': { target: 'closed' }
      }
    }
  }
});
```

---

### `/web/js/machines/uploadMachine.js` — **Presigned upload w/ progress**

```js
// web/js/machines/uploadMachine.js
import { setup, createMachine, assign, fromPromise } from 'xstate';
import * as api from '../services/api.js';

// XHR upload helper to report progress
function uploadFileXhr({ url, headers, file }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        // Consumers can listen via parent action; we store last known value
      }
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(file);
  });
}

export const uploadMachine = setup({
  actions: {
    setFile: assign(({ event }) => ({ file: event.file, requirementId: event.requirementId })),
    setProgress: assign(({ event }) => ({ progress: event.progress })),
    setPresign: assign(({ event }) => ({ presign: event.output })),
    clear: assign(() => ({ file: null, progress: 0, presign: null, error: null })),
    setError: assign(({ event }) => ({ error: event.error }))
  },
  actors: {
    getUploadUrl: fromPromise(({ input }) => api.getUploadUrl(input)),
    confirmUpload: fromPromise(({ input }) => api.confirmUpload(input)),
    upload: fromPromise(({ input }) => uploadFileXhr(input))
  }
}).createMachine({
  id: 'upload',
  context: {
    requirementId: null,
    file: null,
    presign: null,
    progress: 0,
    error: null
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        'UPLOAD.SELECT_FILE': { target: 'requestingUrl', actions: 'setFile' }
      }
    },
    requestingUrl: {
      invoke: {
        src: 'getUploadUrl',
        input: ({ context }) => ({
          requirementId: context.requirementId,
          fileName: context.file.name,
          size: context.file.size,
          contentType: context.file.type,
          md5: null // compute if you need
        })
      },
      on: {
        'done.invoke.getUploadUrl': { target: 'uploading', actions: 'setPresign' },
        'error.invoke.getUploadUrl': { target: 'error', actions: 'setError' }
      }
    },
    uploading: {
      invoke: {
        src: 'upload',
        input: ({ context }) => ({ url: context.presign.url, headers: context.presign.headers, file: context.file })
      },
      on: {
        'done.invoke.upload': { target: 'verifying' },
        'error.invoke.upload': { target: 'error', actions: 'setError' }
      }
    },
    verifying: {
      invoke: {
        src: 'confirmUpload',
        input: ({ context }) => ({
          requirementId: context.requirementId,
          key: context.presign.key,
          fileName: context.file.name,
          size: context.file.size,
          checksum: null
        })
      },
      on: {
        'done.invoke.confirmUpload': { target: 'done' },
        'error.invoke.confirmUpload': { target: 'error', actions: 'setError' }
      }
    },
    done: {
      entry: 'clear',
      on: { 'UPLOAD.RESET': { target: 'idle' } }
    },
    error: {
      on: {
        'UPLOAD.RETRY': { target: 'requestingUrl' },
        'UPLOAD.RESET': { target: 'idle', actions: 'clear' }
      }
    }
  }
});
```

---

### `/web/js/machines/approvalMachine.js` — **Approve / reject**

```js
// web/js/machines/approvalMachine.js
import { setup, createMachine, fromPromise } from 'xstate';
import * as api from '../services/api.js';

export const approvalMachine = setup({
  actors: {
    approve: fromPromise(({ input }) => api.approveDocument(input)),
    reject: fromPromise(({ input }) => api.rejectDocument(input))
  }
}).createMachine({
  id: 'approval',
  context: { documentId: null, reason: null },
  initial: 'pending',
  on: {
    'SET.DOCUMENT': { actions: ({ context, event }) => { context.documentId = event.documentId; } }
  },
  states: {
    pending: {
      on: {
        'APPROVAL.APPROVE': { target: 'approving' },
        'APPROVAL.REJECT': { target: 'rejecting' }
      }
    },
    approving: {
      invoke: { src: 'approve', input: ({ context }) => ({ documentId: context.documentId }) },
      on: { 'done.invoke.approve': { target: 'approved' }, 'error.invoke.approve': { target: 'pending' } }
    },
    rejecting: {
      invoke: { src: 'reject', input: ({ context, event }) => ({ documentId: context.documentId, reason: event.reason }) },
      on: { 'done.invoke.reject': { target: 'rejected' }, 'error.invoke.reject': { target: 'pending' } }
    },
    approved: { type: 'final' },
    rejected: { type: 'final' }
  }
});
```

---

### `/web/js/machines/automationMachine.js` — **Rule list / edit**

```js
// web/js/machines/automationMachine.js
import { setup, createMachine, assign, fromPromise } from 'xstate';
import * as api from '../services/api.js';

export const automationMachine = setup({
  actions: {
    setList: assign(({ event }) => ({ rules: event.output.rules })),
    setDraft: assign(({ event }) => ({ draft: event.rule ?? null })),
    clearDraft: assign(() => ({ draft: null }))
  },
  actors: {
    fetchList: fromPromise(api.listAutomations),
    saveRule: fromPromise(({ input }) => api.saveAutomation(input)),
    testRule: fromPromise(({ input }) => api.testAutomation(input))
  }
}).createMachine({
  id: 'automations',
  context: { rules: [], draft: null },
  initial: 'list',
  states: {
    list: {
      invoke: { src: 'fetchList' },
      on: {
        'done.invoke.fetchList': { actions: 'setList' },
        'AUTOMATION.CREATE': { target: 'editing', actions: 'setDraft' },
        'AUTOMATION.EDIT': { target: 'editing', actions: 'setDraft' }
      }
    },
    editing: {
      on: {
        'AUTOMATION.CANCEL': { target: 'list', actions: 'clearDraft' },
        'AUTOMATION.SAVE': { target: 'saving' },
        'AUTOMATION.TEST': { target: 'testing' }
      }
    },
    saving: {
      invoke: { src: 'saveRule', input: ({ context }) => ({ rule: context.draft }) },
      on: { 'done.invoke.saveRule': { target: 'list', actions: 'clearDraft' }, 'error.invoke.saveRule': { target: 'editing' } }
    },
    testing: {
      invoke: { src: 'testRule', input: ({ context }) => ({ ruleId: context.draft?.id, payload: {} }) },
      on: { 'done.invoke.testRule': { target: 'editing' }, 'error.invoke.testRule': { target: 'editing' } }
    }
  }
});
```

---

### `/web/js/main.js` — **Bootstrapping**

```js
// web/js/main.js
import { createActor } from 'xstate';
import { appMachine } from './machines/appMachine.js';

// Start the app
export const appActor = createActor(appMachine);
appActor.subscribe((snapshot) => {
  // Optional: simple logging / render hooks
  // console.log('[app]', snapshot.value, snapshot.context);
});
appActor.start();

// Example DOM hookups:
// document.querySelector('#loginForm')?.addEventListener('submit', (e) => {
//   e.preventDefault();
//   const email = new FormData(e.currentTarget).get('email');
//   const password = new FormData(e.currentTarget).get('password');
//   appActor.send({ type: 'LOGIN.SUBMIT', email, password });
// });
```

---

## Notes on wiring & composition

* **Where to spawn children:**

  * Spawn `gridMachine` when the router is on `overview` or `projectsActive` route.
  * Spawn `drawerMachine` at the app level (singleton) or per grid row; send it `DRAWER.OPEN` on cell click.
  * Spawn `uploadMachine` only when an upload modal opens; stop it when modal closes.
  * Spawn `approvalMachine` from the drawer when a document is selected.

* **Event boundaries:** keep UI events descriptive and domain‑level:

  * `GRID.RELOAD`, `CELL.CLICK`, `DRAWER.OPEN`, `UPLOAD.SELECT_FILE`, `APPROVAL.APPROVE`.

* **Routing:** `routerMachine` updates the `route` in context and pushes history. Your render function should decide which page to show based on `routerSnapshot.context.route.name`.

---

If you’d like, I can also produce **small render helpers** (pure functions) to mount/unmount views based on `routerMachine` tags, plus **Playwright fixtures** that interact with these machines.
