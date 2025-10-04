import { setup, fromPromise, assign } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import * as api from '../services/api.js';

export const appMachine = setup({
    types: {
        context: {},
        events: {}
    },
    actions: {
        setUser: assign(({ event }) => ({
            user: event.output?.user ?? null,
            tokens: event.output?.tokens ?? null,
            error: null
        })),
        setError: assign(({ event }) => ({ 
            error: event.error?.message ?? 'An error occurred' 
        })),
        clearUser: assign(() => ({ 
            user: null, 
            tokens: null, 
            error: null 
        }))
    },
    actors: {
        checkSession: fromPromise(api.checkSession),
        login: fromPromise(({ input }) => api.login(input)),
        logout: fromPromise(api.logout)
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
                src: 'checkSession',
                onDone: [
                    {
                        guard: ({ event }) => !!event.output?.user,
                        target: 'authenticated',
                        actions: 'setUser'
                    },
                    { target: 'unauthenticated' }
                ],
                onError: { target: 'unauthenticated' }
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
                input: ({ event }) => ({ 
                    email: event.email, 
                    password: event.password 
                }),
                onDone: { 
                    target: 'authenticated', 
                    actions: 'setUser' 
                },
                onError: { 
                    target: 'unauthenticated', 
                    actions: 'setError' 
                }
            }
        },
        authenticated: {
            on: {
                'AUTH.LOGOUT': { 
                    target: 'loggingOut'
                }
            }
        },
        loggingOut: {
            invoke: {
                src: 'logout',
                onDone: { 
                    target: 'unauthenticated', 
                    actions: 'clearUser' 
                },
                onError: { 
                    target: 'unauthenticated', 
                    actions: 'clearUser' 
                }
            }
        }
    }
});
