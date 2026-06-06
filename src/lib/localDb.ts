import localforage from 'localforage';

localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'CeylonPetsPOS',
    version: 1.0,
    storeName: 'sync_queue',
    description: 'Offline transaction queue for CeylonPets'
});

export const db = localforage;
