// project-grid.js
// A vanilla Custom Element + Shadow DOM + XState v5 for state management.
// Renders a projects x milestones matrix with color semantics and skill labels.

import {
  setup, createMachine, createActor, assign
} from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      --col-width: 120px;
      --project-col-width: 320px;
      --gap: 0px;

      --c-bg: #ffffff;
      --c-panel: #ffffff;
      --c-border: #e5e7eb;
      --c-text: #1f2937;
      --c-muted: #6b7280;

      --c-white: #ffffff;
      --c-gray: #9aa0a6;
      --c-orange: #f2994a;
      --c-red: #ff5a5f;
      --c-green: #18b26b;

      display: block;
      color: var(--c-text);
      font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }

    .grid {
      border: 1px solid var(--c-border);
      border-radius: 12px;
      overflow: auto;
      background: var(--c-panel);
    }

    .row, .header {
      display: grid;
      grid-template-columns: var(--project-col-width) repeat(var(--col-count), var(--col-width));
      gap: var(--gap);
    }

    .header {
      position: sticky; top: 0; z-index: 2;
      background: #f9fafb;
      border-bottom: 1px solid var(--c-border);
      font-weight: 600;
    }

    .hcell, .cell, .pcol {
      padding: 8px 10px;
      border-bottom: 1px solid var(--c-border);
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }

    /* Sticky first column */
    .pcol, .h-project {
      position: sticky; left: 0; z-index: 3;
      background: #f9fafb;
      border-right: 1px solid var(--c-border);
    }
    .pcol { background: #ffffff; }

    .hcell {
      color: var(--c-muted);
      user-select: none;
    }

    .pcol .name {
      font-weight: 600;
    }
    .pcol .meta {
      font-size: 12px; color: var(--c-muted);
    }

    /* Cell content */
    .cell {
      position: relative;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      outline: none;
    }
    .cell:focus-visible {
      box-shadow: inset 0 0 0 2px #5e9cff;
      border-radius: 8px;
    }

    .swatch {
      width: 20px; height: 20px;
      border-radius: 6px;
      border: 1px solid var(--c-border);
      background: transparent;
      position: relative;
    }
    .swatch.white { background: var(--c-white); }
    .swatch.gray { background: var(--c-gray); }
    .swatch.orange { background: var(--c-orange); }
    .swatch.red { background: var(--c-red); }
    .swatch.green { background: var(--c-green); }

    /* Red late dot for DONE late */
    .swatch.late::after {
      content: "";
      position: absolute;
      right: -3px; top: -3px;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--c-red);
      border: 2px solid #ffffff; /* ring to avoid blending issues */
    }

    .milestone-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--c-text);
      line-height: 1.2;
      text-align: center;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 6px;
      padding: 2px 4px;
      border-bottom: 1px solid var(--c-border);
    }

    .skill {
      margin-top: 4px;
      font-size: 11px;
      color: var(--c-muted);
      line-height: 1.1;
      text-align: center;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .legend {
      display: flex; gap: 14px; align-items: center;
      margin: 10px 0;
      color: var(--c-muted);
      font-size: 12px;
    }
    .legend .item { display: inline-flex; align-items: center; gap: 6px; }
    .legend .dot {
      width: 14px; height: 14px; border-radius: 4px;
      border: 1px solid var(--c-border);
      display: inline-block;
    }
    .legend .late::after {
      content:""; position:relative; left:2px; top:-9px;
      display:inline-block; width:6px; height:6px; border-radius:50%; background: var(--c-red);
    }

    .empty { padding: 18px; color: var(--c-muted); }
  </style>
  <div class="legend" part="legend" aria-hidden="true">
    <span class="item"><span class="dot" style="background:#fff"></span> Not started</span>
    <span class="item"><span class="dot" style="background:#9aa0a6"></span> In progress</span>
    <span class="item"><span class="dot" style="background:#f2994a"></span> Risk</span>
    <span class="item"><span class="dot" style="background:#ff5a5f"></span> Failed/Overdue</span>
    <span class="item">
      <span class="dot" style="background:#18b26b; position:relative;"></span><span class="late"></span> Done (red dot = late)
    </span>
  </div>
  <div class="grid" role="table" aria-label="Projects grid">
    <div class="header" role="row">
      <div class="hcell h-project" role="columnheader">Project</div>
      <div class="hcols"></div>
    </div>
    <div class="body" role="rowgroup"></div>
  </div>
`;

function statusToClass(status) {
  switch (status) {
    case 'NOT_STARTED': return 'white';
    case 'IN_PROGRESS': return 'gray';
    case 'RISK':        return 'orange';
    case 'FAILED':
    case 'OVERDUE':     return 'red';
    case 'DONE':        return 'green';
    default:            return 'white';
  }
}

function shouldShowSkill(status) {
  return status === 'IN_PROGRESS' || status === 'RISK' || status === 'FAILED' || status === 'OVERDUE';
}

// XState machine controls component lifecycle & data
const gridCompMachine = setup({
  actions: {
    setData: assign(({ event }) => ({ data: event.data })),
    setOptions: assign(({ event, context }) => ({ options: { ...context.options, ...(event.options || {}) } }))
  }
}).createMachine({
  id: 'projectGrid',
  context: {
    data: /** @type {null | {columns:any[]; rows:any[]}} */(null),
    options: { showLegend: true }
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        'SET_DATA': { target: 'ready', actions: 'setData' },
        'SET_OPTIONS': { actions: 'setOptions' }
      }
    },
    ready: {
      on: {
        'SET_DATA': { actions: 'setData' },
        'SET_OPTIONS': { actions: 'setOptions' }
      }
    }
  }
});

export class ProjectGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
    this._grid = this.shadowRoot.querySelector('.grid');
    this._hcols = this.shadowRoot.querySelector('.hcols');
    this._body  = this.shadowRoot.querySelector('.body');
    this._legend = this.shadowRoot.querySelector('.legend');

    this._actor = createActor(gridCompMachine);
    this._actor.subscribe((snap) => this._render(snap.context));
    this._actor.start();
  }

  /** External: set the full data set (columns + rows) */
  set data(val) {
    this._actor.send({ type: 'SET_DATA', data: val });
  }
  get data() { return this._actor.getSnapshot()?.context.data ?? null; }

  /** External: set options (e.g., { showLegend:false }) */
  set options(val) {
    this._actor.send({ type: 'SET_OPTIONS', options: val });
  }
  get options() { return this._actor.getSnapshot()?.context.options ?? {}; }

  connectedCallback() {
    // make header reflect initial style sizing
    this._applyColVars();
  }

  /** Render based on context.data & options */
  _render(ctx) {
    const { data, options } = ctx;
    this._legend.style.display = options?.showLegend ? '' : 'none';

    if (!data || !data.columns?.length) {
      this._hcols.innerHTML = '';
      this._body.innerHTML = `<div class="empty">No data</div>`;
      this._applyColVars(0);
      return;
    }

    // Header columns
    this._hcols.innerHTML = '';
    const fragH = document.createDocumentFragment();
    for (const col of data.columns) {
      const hc = document.createElement('div');
      hc.className = 'hcell';
      hc.setAttribute('role', 'columnheader');
      hc.textContent = col.name;
      fragH.appendChild(hc);
    }
    this._hcols.appendChild(fragH);

    // Rows
    this._body.innerHTML = '';
    const fragB = document.createDocumentFragment();
    for (const row of data.rows) {
      const r = document.createElement('div');
      r.className = 'row';
      r.setAttribute('role', 'row');

      // Project column (sticky)
      const pcol = document.createElement('div');
      pcol.className = 'pcol';
      pcol.setAttribute('role', 'rowheader');
      pcol.innerHTML = `
        <div class="name">${escapeHtml(row.projectName)}</div>
        <div class="meta">${row.meta?.owner ? `Owner • ${escapeHtml(row.meta.owner)}` : ''}</div>
      `;
      r.appendChild(pcol);

      // Cells
      for (const col of data.columns) {
        const cellData = row.cells[col.id] ?? { status: 'NOT_STARTED' };
        const swatchClass = statusToClass(cellData.status);
        const showSkill = shouldShowSkill(cellData.status) && cellData.skill;

        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.tabIndex = 0;
        cell.title = cellData.tooltip ?? `${col.name} – ${cellData.status}`;
        cell.setAttribute('role', 'gridcell');
        cell.dataset.projectId = row.projectId;
        cell.dataset.milestoneId = col.id;

        // Show milestone name at top if available
        if (cellData.milestoneName && !cellData.isEmpty) {
          const milestoneName = document.createElement('div');
          milestoneName.className = 'milestone-name';
          milestoneName.textContent = cellData.milestoneName;
          milestoneName.title = cellData.milestoneName;
          cell.appendChild(milestoneName);
        }

        // swatch
        const swatch = document.createElement('div');
        swatch.className = `swatch ${swatchClass}${cellData.late && cellData.status === 'DONE' ? ' late' : ''}`;
        swatch.setAttribute('aria-label', `${col.name} status ${cellData.status}${cellData.late ? ' (late)' : ''}`);

        cell.appendChild(swatch);

        if (showSkill) {
          const skill = document.createElement('div');
          skill.className = 'skill';
          skill.textContent = cellData.skill;
          cell.appendChild(skill);
        }

        // Interaction: click → dispatch event to host
        cell.addEventListener('click', () => {
          // Skip empty cells
          if (cellData.isEmpty) return;
          
          this.dispatchEvent(new CustomEvent('cell-click', {
            bubbles: true, composed: true,
            detail: {
              projectId: row.projectId,
              projectName: row.projectName,
              milestoneId: cellData.milestoneId || col.id,
              milestoneName: cellData.milestoneName || col.name,
              cell: cellData
            }
          }));
        });

        r.appendChild(cell);
      }

      fragB.appendChild(r);
    }
    this._body.appendChild(fragB);

    this._applyColVars(data.columns.length);
  }

  _applyColVars(colCount = 0) {
    this.style.setProperty('--col-count', String(colCount));
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

customElements.define('project-grid', ProjectGrid);
