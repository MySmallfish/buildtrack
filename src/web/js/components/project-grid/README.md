# Project Grid Component

A vanilla Web Component (`<project-grid>`) with XState v5 for state management that renders a projects × milestones matrix with color-coded status indicators.

## Features

- **Framework-free**: Vanilla JavaScript with Shadow DOM
- **State management**: XState v5 for predictable state transitions
- **Accessible**: ARIA labels, keyboard navigation (focusable cells)
- **Responsive**: Sticky headers and project column
- **Color semantics**: Visual status indicators with skill labels
- **Event-driven**: Emits custom events for integration

## Status Color Mapping

| Status | Color | Skill Label | Notes |
|--------|-------|-------------|-------|
| `NOT_STARTED` | White | No | Empty/transparent with border |
| `IN_PROGRESS` | Gray | Yes | Documents received but not approved |
| `RISK` | Orange | Yes | In progress but may be overdue |
| `FAILED` / `OVERDUE` | Red | Yes | Failed checks or missed due date |
| `DONE` | Green | No | Completed (red dot if `late: true`) |

## Installation

```javascript
import './components/project-grid/project-grid.js';
```

## Usage

### Basic Example

```html
<project-grid id="grid"></project-grid>

<script type="module">
  import './components/project-grid/project-grid.js';

  const grid = document.getElementById('grid');

  grid.data = {
    columns: [
      { id: 'm1', name: 'Design' },
      { id: 'm2', name: 'Permitting' },
      { id: 'm3', name: 'Foundation' }
    ],
    rows: [
      {
        projectId: 'p1',
        projectName: 'Midtown Complex',
        meta: { owner: 'Alex PM' },
        cells: {
          m1: { status: 'DONE', late: true },
          m2: { status: 'IN_PROGRESS', skill: 'Architect' },
          m3: { status: 'RISK', skill: 'Constructor' }
        }
      }
    ]
  };

  // Listen for cell clicks
  grid.addEventListener('cell-click', (e) => {
    console.log('Clicked:', e.detail);
    // { projectId, projectName, milestoneId, milestoneName, cell }
  });
</script>
```

## Data Contract

### GridData

```typescript
type GridData = {
  columns: GridColumn[];
  rows: GridRow[];
};
```

### GridColumn

```typescript
type GridColumn = {
  id: string;        // Unique identifier
  name: string;      // Display name
};
```

### GridRow

```typescript
type GridRow = {
  projectId: string;
  projectName: string;
  meta?: Record<string, any>;  // Optional metadata (e.g., owner)
  cells: Record<string, GridCell>;  // Keyed by column.id
};
```

### GridCell

```typescript
type GridCell = {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'RISK' | 'FAILED' | 'OVERDUE' | 'DONE';
  late?: boolean;      // Only meaningful when status === 'DONE'
  skill?: string;      // Shown under swatch for IN_PROGRESS/RISK/FAILED/OVERDUE
  tooltip?: string;    // Optional title attribute
};
```

## API

### Properties

#### `data`
Get/set the grid data.

```javascript
grid.data = { columns: [...], rows: [...] };
const currentData = grid.data;
```

#### `options`
Get/set component options.

```javascript
grid.options = { showLegend: false };
```

**Available options:**
- `showLegend` (boolean): Show/hide the legend. Default: `true`

### Events

#### `cell-click`
Fired when a cell is clicked.

```javascript
grid.addEventListener('cell-click', (event) => {
  const {
    projectId,
    projectName,
    milestoneId,
    milestoneName,
    cell  // GridCell data
  } = event.detail;
});
```

## Styling

Customize via CSS custom properties:

```css
project-grid {
  --col-width: 140px;
  --project-col-width: 360px;
  --c-border: #333;
  --c-text: #fff;
  /* ... see component source for all variables */
}
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│        | Design    | Permitting | Foundation           │
├────────┼───────────┼────────────┼──────────────────────┤
│ P-001  │ [  ◻  ]   │ [ ■ ]      │ [ ■● ]               │
│ Midtown│ (white)   │ Gray       │ Green + red dot      │
│        │           │ Architect  │ (late)               │
├────────┼───────────┼────────────┼──────────────────────┤
│ P-002  │ [ ■ ]     │ [ ■ ]      │ [ ■ ]                │
│ Harbor │ Red       │ Orange     │ Gray                 │
│        │ Engineer  │ Architect  │ Inspector            │
└────────┴───────────┴────────────┴──────────────────────┘
```

**Legend:**
- `[  ◻  ]` = White (NOT_STARTED)
- `[ ■ ]` = Colored swatch
- `[ ■● ]` = Green with red dot (DONE but late)
- Text under swatch = Responsible skill

## Notes

- **No internal calculations**: You supply `status` and `late`; the component just renders
- **Skill visibility**: Only shown for `IN_PROGRESS`, `RISK`, `FAILED`, `OVERDUE`
- **Late completion**: Red dot appears on `DONE` cells when `late: true`
- **Accessibility**: Cells are focusable (`tabindex="0"`) with ARIA labels
- **Performance**: Efficient rendering with DocumentFragment

## Demo

Open `demo.html` in a browser to see the component in action with sample data.

## Browser Support

- Modern browsers with Web Components support
- ES6+ features (modules, template literals, etc.)
- XState v5 loaded from CDN (or bundle it yourself)

## License

Part of the BuildTrack project.
