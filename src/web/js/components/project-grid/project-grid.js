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
      grid-template-columns: var(--project-col-width) 1fr;
      gap: var(--gap);
    }

    .header {
      position: sticky; top: 0; z-index: 2;
      background: #f9fafb;
      border-bottom: 1px solid var(--c-border);
      font-weight: 600;
    }

    .hcell, .pcol {
      padding: 8px 10px;
      border-bottom: 1px solid var(--c-border);
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }

    .milestones-cell {
      padding: 8px 10px;
      border-bottom: 1px solid var(--c-border);
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      flex-wrap: wrap;
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

    /* Milestone item */
    .milestone-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      outline: none;
      padding: 6px 8px;
      border-radius: 8px;
      transition: background-color 0.15s;
    }
    .milestone-item:hover {
      background-color: #f3f4f6;
    }
    .milestone-item:focus-visible {
      box-shadow: inset 0 0 0 2px #5e9cff;
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
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
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
      <div class="hcell" role="columnheader">Milestones</div>
    </div>
    <div class="body" role="rowgroup"></div>
  </div>
`;

function statusToClass(status) {
  switch (status) {
    case 'NOT_STARTED': return 'white';
    case 'IN_PROGRESS': return 'gray';
    case 'RISK':
    case 'BLOCKED':     return 'orange';
    case 'FAILED':
    case 'OVERDUE':     return 'red';
    case 'DONE':        return 'green';
    default:            return 'white';
  }
}

function shouldShowSkill(status) {
  return status === 'IN_PROGRESS' || status === 'RISK' || status === 'BLOCKED' || status === 'FAILED' || status === 'OVERDUE';
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
    // Component connected to DOM
  }

  /** Render based on context.data & options */
  _render(ctx) {
    const { data, options } = ctx;
    this._legend.style.display = options?.showLegend ? '' : 'none';

    if (!data || !data.rows?.length) {
      this._body.innerHTML = `<div class="empty">No data</div>`;
      return;
    }

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

      // Milestones cell - contains all milestones for this project
      const milestonesCell = document.createElement('div');
      milestonesCell.className = 'milestones-cell';
      milestonesCell.setAttribute('role', 'gridcell');

      // Get all milestones for this project
      const milestones = row.milestones || [];
      
      if (milestones.length === 0) {
        milestonesCell.innerHTML = '<span style="color: var(--c-muted); font-size: 12px;">No milestones</span>';
      } else {
        // Create a milestone item for each milestone
        milestones.forEach((milestone) => {
          const swatchClass = statusToClass(milestone.status);
          const showSkill = shouldShowSkill(milestone.status) && milestone.skill;

          const milestoneItem = document.createElement('div');
          milestoneItem.className = 'milestone-item';
          milestoneItem.tabIndex = 0;
          milestoneItem.title = milestone.tooltip ?? `${milestone.name} – ${milestone.status}`;
          milestoneItem.dataset.projectId = row.projectId;
          milestoneItem.dataset.milestoneId = milestone.id;

          // Milestone name
          const nameDiv = document.createElement('div');
          nameDiv.className = 'milestone-name';
          nameDiv.textContent = milestone.name || 'Unnamed';
          nameDiv.title = milestone.name;
          milestoneItem.appendChild(nameDiv);

          // Swatch
          const swatch = document.createElement('div');
          swatch.className = `swatch ${swatchClass}${milestone.late && milestone.status === 'DONE' ? ' late' : ''}`;
          swatch.setAttribute('aria-label', `${milestone.name} status ${milestone.status}${milestone.late ? ' (late)' : ''}`);
          milestoneItem.appendChild(swatch);

          // Skill
          if (showSkill) {
            const skill = document.createElement('div');
            skill.className = 'skill';
            skill.textContent = milestone.skill;
            milestoneItem.appendChild(skill);
          }

          // Interaction: click → dispatch event to host
          milestoneItem.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('cell-click', {
              bubbles: true, composed: true,
              detail: {
                projectId: row.projectId,
                projectName: row.projectName,
                milestoneId: milestone.id,
                milestoneName: milestone.name,
                cell: milestone
              }
            }));
          });

          milestonesCell.appendChild(milestoneItem);
        });
      }

      r.appendChild(milestonesCell);
      fragB.appendChild(r);
    }
    this._body.appendChild(fragB);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

customElements.define('project-grid', ProjectGrid);
