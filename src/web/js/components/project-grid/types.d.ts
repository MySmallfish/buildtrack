/**
 * Type definitions for project-grid component
 */

export type MilestoneStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'RISK'
  | 'FAILED'
  | 'OVERDUE'
  | 'DONE';

export interface GridColumn {
  /** Unique identifier for the column */
  id: string;
  /** Display name */
  name: string;
}

export interface GridCell {
  /** Current status of the milestone */
  status: MilestoneStatus;
  /** Whether the milestone was completed late (only meaningful when status === 'DONE') */
  late?: boolean;
  /** Responsible skill/role (shown for IN_PROGRESS, RISK, FAILED, OVERDUE) */
  skill?: string;
  /** Optional tooltip text */
  tooltip?: string;
}

export interface GridRow {
  /** Unique project identifier */
  projectId: string;
  /** Project display name */
  projectName: string;
  /** Optional metadata (e.g., owner, code, etc.) */
  meta?: Record<string, any>;
  /** Cells keyed by column.id */
  cells: Record<string, GridCell>;
}

export interface GridData {
  /** Column definitions */
  columns: GridColumn[];
  /** Project rows */
  rows: GridRow[];
}

export interface GridOptions {
  /** Whether to show the legend */
  showLegend?: boolean;
}

export interface CellClickDetail {
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Milestone/column ID */
  milestoneId: string;
  /** Milestone/column name */
  milestoneName: string;
  /** Cell data */
  cell: GridCell;
}

export interface CellClickEvent extends CustomEvent<CellClickDetail> {
  type: 'cell-click';
}

/**
 * Project Grid Web Component
 * 
 * @example
 * ```typescript
 * const grid = document.querySelector('project-grid') as ProjectGrid;
 * grid.data = {
 *   columns: [{ id: 'm1', name: 'Design' }],
 *   rows: [{
 *     projectId: 'p1',
 *     projectName: 'Project 1',
 *     cells: { m1: { status: 'IN_PROGRESS', skill: 'Architect' } }
 *   }]
 * };
 * 
 * grid.addEventListener('cell-click', (e: CellClickEvent) => {
 *   console.log(e.detail.projectName, e.detail.cell.status);
 * });
 * ```
 */
export class ProjectGrid extends HTMLElement {
  /** Set/get the grid data */
  data: GridData | null;
  
  /** Set/get component options */
  options: GridOptions;
  
  /**
   * Add event listener for cell clicks
   * @param type - Event type ('cell-click')
   * @param listener - Event handler
   */
  addEventListener(
    type: 'cell-click',
    listener: (event: CellClickEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'project-grid': ProjectGrid;
  }
}
