import { setup, fromPromise, assign } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import * as api from '../services/api.js';

export const gridMachine = setup({
    types: {
        context: {},
        events: {}
    },
    actions: {
        setData: assign(({ event }) => ({
            rows: event.output?.rows ?? [],
            columns: event.output?.columns ?? [],
            pageInfo: event.output?.pageInfo ?? {},
            error: null
        })),
        setError: assign(({ event }) => ({
            error: event.error?.message ?? 'Failed to load data'
        })),
        setFilters: assign(({ event }) => ({
            filters: { ...event.filters }
        })),
        setSort: assign(({ event }) => ({
            sort: { ...event.sort }
        })),
        setSelectedCell: assign(({ event }) => ({
            selectedCell: { projectId: event.projectId, milestoneId: event.milestoneId }
        })),
        clearSelection: assign(() => ({
            selectedCell: null
        }))
    },
    actors: {
        fetchData: fromPromise(({ input }) => api.fetchProjects(input))
    }
}).createMachine({
    id: 'grid',
    context: {
        rows: [],
        columns: [],
        filters: {},
        sort: {},
        pageInfo: { page: 1, total: 0 },
        selectedCell: null,
        error: null
    },
    initial: 'loading',
    states: {
        loading: {
            invoke: {
                src: 'fetchData',
                input: ({ context }) => ({
                    filters: context.filters,
                    sort: context.sort,
                    page: context.pageInfo.page
                }),
                onDone: {
                    target: 'idle',
                    actions: 'setData'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            }
        },
        idle: {
            on: {
                'FILTER.CHANGE': {
                    target: 'loading',
                    actions: 'setFilters'
                },
                'SORT.CHANGE': {
                    target: 'loading',
                    actions: 'setSort'
                },
                'CELL.SELECT': {
                    actions: 'setSelectedCell'
                },
                'REFRESH': {
                    target: 'loading'
                }
            }
        },
        error: {
            on: {
                'RETRY': {
                    target: 'loading'
                }
            }
        }
    }
});
