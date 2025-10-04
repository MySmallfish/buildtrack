import { setup, fromPromise, assign } from 'https://cdn.jsdelivr.net/npm/xstate@5/+esm';
import * as api from '../services/api.js';

export const uploadMachine = setup({
    types: {
        context: {},
        events: {}
    },
    actions: {
        setFile: assign(({ event }) => ({
            file: event.file,
            fileName: event.file.name,
            fileSize: event.file.size,
            contentType: event.file.type
        })),
        setUploadUrl: assign(({ event }) => ({
            uploadUrl: event.output.url,
            uploadHeaders: event.output.headers,
            storageKey: event.output.key
        })),
        setProgress: assign(({ event }) => ({
            progress: event.progress
        })),
        setError: assign(({ event }) => ({
            error: event.error?.message ?? 'Upload failed'
        })),
        clearData: assign(() => ({
            file: null,
            fileName: null,
            fileSize: null,
            contentType: null,
            uploadUrl: null,
            uploadHeaders: null,
            storageKey: null,
            progress: 0,
            error: null
        }))
    },
    actors: {
        getUploadUrl: fromPromise(({ input }) => api.getUploadUrl(input)),
        uploadToS3: fromPromise(async ({ input }) => {
            const { file, url, headers } = input;
            
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded / e.total) * 100);
                        // Send progress event to machine
                        window.dispatchEvent(new CustomEvent('upload-progress', { detail: { progress } }));
                    }
                });
                
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({ success: true });
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                });
                
                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });
                
                xhr.open('PUT', url);
                Object.entries(headers).forEach(([key, value]) => {
                    xhr.setRequestHeader(key, value);
                });
                xhr.send(file);
            });
        }),
        confirmUpload: fromPromise(({ input }) => api.confirmUpload(input))
    }
}).createMachine({
    id: 'upload',
    context: {
        requirementId: null,
        file: null,
        fileName: null,
        fileSize: null,
        contentType: null,
        uploadUrl: null,
        uploadHeaders: null,
        storageKey: null,
        progress: 0,
        error: null
    },
    initial: 'idle',
    states: {
        idle: {
            on: {
                'FILE.SELECT': {
                    target: 'gettingUrl',
                    actions: 'setFile'
                }
            }
        },
        gettingUrl: {
            invoke: {
                src: 'getUploadUrl',
                input: ({ context, event }) => ({
                    requirementId: event.requirementId,
                    fileName: context.fileName,
                    contentType: context.contentType,
                    size: context.fileSize
                }),
                onDone: {
                    target: 'uploading',
                    actions: 'setUploadUrl'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            }
        },
        uploading: {
            invoke: {
                src: 'uploadToS3',
                input: ({ context }) => ({
                    file: context.file,
                    url: context.uploadUrl,
                    headers: context.uploadHeaders
                }),
                onDone: {
                    target: 'confirming'
                },
                onError: {
                    target: 'error',
                    actions: 'setError'
                }
            },
            on: {
                'PROGRESS.UPDATE': {
                    actions: 'setProgress'
                }
            }
        },
        confirming: {
            invoke: {
                src: 'confirmUpload',
                input: ({ context, event }) => ({
                    requirementId: event.requirementId,
                    key: context.storageKey,
                    fileName: context.fileName,
                    size: context.fileSize
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
                    target: 'gettingUrl'
                },
                'CANCEL': {
                    target: 'idle',
                    actions: 'clearData'
                }
            }
        }
    }
});
