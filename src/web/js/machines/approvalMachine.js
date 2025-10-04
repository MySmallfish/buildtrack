import { setup, fromPromise, assign } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import * as api from '../services/api.js';

export const approvalMachine = setup({
    types: {
        context: {},
        events: {}
    },
    actions: {
        setDocument: assign(({ event }) => ({
            documentId: event.documentId,
            error: null
        })),
        setReason: assign(({ event }) => ({
            rejectionReason: event.reason
        })),
        setError: assign(({ event }) => ({
            error: event.error?.message ?? 'Operation failed'
        })),
        clearData: assign(() => ({
            documentId: null,
            rejectionReason: null,
            error: null
        }))
    },
    actors: {
        approve: fromPromise(({ input }) => api.approveDocument(input)),
        reject: fromPromise(({ input }) => api.rejectDocument(input))
    }
}).createMachine({
    id: 'approval',
    context: {
        documentId: null,
        rejectionReason: null,
        error: null
    },
    initial: 'idle',
    states: {
        idle: {
            on: {
                'APPROVE.START': {
                    target: 'approving',
                    actions: 'setDocument'
                },
                'REJECT.START': {
                    target: 'rejectingInput',
                    actions: 'setDocument'
                }
            }
        },
        approving: {
            invoke: {
                src: 'approve',
                input: ({ context }) => ({
                    documentId: context.documentId
                }),
                onDone: {
                    target: 'success'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            }
        },
        rejectingInput: {
            on: {
                'REJECT.SUBMIT': {
                    target: 'rejecting',
                    actions: 'setReason'
                },
                'REJECT.CANCEL': {
                    target: 'idle',
                    actions: 'clearData'
                }
            }
        },
        rejecting: {
            invoke: {
                src: 'reject',
                input: ({ context }) => ({
                    documentId: context.documentId,
                    reason: context.rejectionReason
                }),
                onDone: {
                    target: 'success'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            }
        },
        success: {
            on: {
                'RESET': {
                    target: 'idle',
                    actions: 'clearData'
                }
            }
        },
        error: {
            on: {
                'RETRY': {
                    target: 'idle'
                },
                'CANCEL': {
                    target: 'idle',
                    actions: 'clearData'
                }
            }
        }
    }
});
