import { setup, fromPromise, assign } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import * as api from '../services/api.js';

export const drawerMachine = setup({
    types: {
        context: {},
        events: {}
    },
    actions: {
        setSummary: assign(({ event }) => ({
            project: event.output?.project,
            milestone: event.output?.milestone,
            stats: event.output?.stats,
            error: null
        })),
        setError: assign(({ event }) => ({
            error: event.error?.message ?? 'Failed to load summary'
        })),
        clearData: assign(() => ({
            project: null,
            milestone: null,
            stats: null,
            error: null
        }))
    },
    actors: {
        fetchSummary: fromPromise(({ input }) => api.fetchProjectSummary(input))
    }
}).createMachine({
    id: 'drawer',
    context: {
        project: null,
        milestone: null,
        stats: null,
        error: null
    },
    initial: 'closed',
    states: {
        closed: {
            on: {
                'OPEN': {
                    target: 'loading'
                }
            }
        },
        loading: {
            invoke: {
                src: 'fetchSummary',
                input: ({ event }) => ({
                    projectId: event.projectId,
                    milestoneId: event.milestoneId
                }),
                onDone: {
                    target: 'open',
                    actions: 'setSummary'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            }
        },
        open: {
            on: {
                'CLOSE': {
                    target: 'closed',
                    actions: 'clearData'
                },
                'REFRESH': {
                    target: 'loading'
                }
            }
        },
        error: {
            on: {
                'CLOSE': {
                    target: 'closed',
                    actions: 'clearData'
                },
                'RETRY': {
                    target: 'loading'
                }
            }
        }
    }
});
