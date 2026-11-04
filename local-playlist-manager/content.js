(function () {
    'use strict';

    function mainWorldPlugin() {
        if (window.__MOEKOE_LOCAL_PLAYLIST_MANAGER_LOADED__) return;
        window.__MOEKOE_LOCAL_PLAYLIST_MANAGER_LOADED__ = true;
        try {
            document.documentElement.setAttribute('data-mk-local-playlist-loaded', '1');
        } catch (_) {
            // ignore
        }

        const PLUGIN_TAG = '[LocalPlaylistManager]';
        const PLUGIN_DB_NAME = 'MoeKoeLocalPlaylistDB';
        const PLUGIN_DB_VERSION = 1;
        const STORE_PLAYLIST_TRACKS = 'playlistTracks';
        const STORE_PLAYLIST_META = 'playlistMeta';

        const HOST_DB_NAME = 'LocalMusicDB';
        const HOST_HANDLE_STORE = 'folderHandles';
        const HOST_TRACK_STORE = 'musicTracks';

        const DEFAULT_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23ffd6e7"/><circle cx="100" cy="100" r="56" fill="%23ff69b4" opacity="0.25"/><path d="M118 62v54.5c0 10.2-8.3 18.5-18.5 18.5S81 126.7 81 116.5 89.3 98 99.5 98c3.8 0 7.3 1.1 10.2 3.1V74h22V62h-13.7z" fill="%23ff69b4"/></svg>`;

        function ensurePluginStyles() {
            if (document.getElementById('mk-local-playlist-styles')) return;
            const style = document.createElement('style');
            style.id = 'mk-local-playlist-styles';
            style.textContent = `
                .mk-local-context-menu {
                    position: fixed;
                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    min-width: 150px;
                    max-width: calc(100vw - 16px);
                    box-sizing: border-box;
                    color: var(--text-color, #333);
                    font-size: 14px;
                    user-select: none;
                }
                .mk-local-context-menu ul {
                    list-style: none;
                    padding: 4px 0;
                    margin: 0;
                }
                .mk-local-context-menu li {
                    padding: 8px 14px;
                    cursor: pointer;
                    position: relative;
                    border-radius: 8px;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background-color 0.15s ease;
                }
                .mk-local-context-menu li:hover {
                    background-color: var(--background-color, #FFF0F5);
                }
                .mk-local-context-menu li .mk-submenu-arrow {
                    margin-left: auto;
                    font-size: 12px;
                    opacity: 0.7;
                }
                .mk-local-context-menu .mk-submenu {
                    position: absolute;
                    left: 100%;
                    top: 0;
                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    padding: 5px 0;
                    max-height: 320px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none;
                    min-width: 160px;
                }
                .mk-local-context-menu.submenu-left .mk-submenu {
                    left: auto;
                    right: 100%;
                }
                .mk-local-context-menu .mk-submenu li {
                    width: 160px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: block;
                }
                .mk-local-playlist-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                }
                .mk-local-playlist-modal {
                    background-color: var(--background-color, #FFF0F5);
                    color: var(--text-color, #333);
                    padding: 20px;
                    border-radius: 8px;
                    min-width: 300px;
                    max-width: 90%;
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }
                .mk-local-playlist-modal h3 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                }
                .mk-local-playlist-modal ul {
                    list-style: none;
                    padding: 0;
                    margin: 12px 0;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .mk-local-playlist-modal li {
                    padding: 10px 12px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    border-radius: 8px;
                }
                .mk-local-playlist-modal li:hover {
                    background-color: var(--secondary-color, #FFB6C1);
                }
                .mk-local-playlist-modal .mk-close-btn {
                    width: 100%;
                    padding: 8px;
                    background-color: var(--primary-color, #FF69B4);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                    font-size: 14px;
                }
                .mk-toast-message {
                    position: fixed;
                    top: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(36, 36, 36, 0.92);
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 10002;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    pointer-events: none;
                    transition: opacity 0.25s ease;
                }
                .dark .mk-local-context-menu,
                .dark .mk-local-context-menu .mk-submenu,
                .dark .mk-local-playlist-modal {
                    background-color: #242424;
                    border-color: #3a3a3a;
                    color: #e5e5e5;
                }
                .dark .mk-local-context-menu li:hover,
                .dark .mk-local-playlist-modal li:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const runtimeTrackMap = new Map();
        const coverUrlCache = new Map();
        const playlistMetaCache = new Map();
        const gidToListIdCache = new Map();

        let userPlaylistsCache = [];
        let lastPlaylistsFetchTime = 0;
        let lastContextSong = null;
        let lastContextListId = null;
        let lastContextMenuInstance = null;

        let interceptNextLocalBatchAction = null;
        let isPeekingSelectedSongs = false;
        let peekedSelectedSongs = null;

        // ==================== 工具函数 ====================

        function isLocalHash(hash) {
            return typeof hash === 'string' && hash.startsWith('local_');
        }

        function isLocalSong(song) {
            if (!song || typeof song !== 'object') return false;
            return !!song.isLocal || isLocalHash(song.hash) || isLocalHash(song.FileHash);
        }

        function getSongHash(song) {
            if (!song) return '';
            if (song.hash && isLocalHash(song.hash)) return String(song.hash);
            if (song.FileHash && isLocalHash(song.FileHash)) return String(song.FileHash);
            if (song.cacheKey) return `local_${song.cacheKey}`;
            if (song.hash) return String(song.hash);
            if (song.FileHash) return String(song.FileHash);
            if (song.name && song.file) {
                return `local_${song.name}_${song.file.size || 0}_${song.file.lastModified || 0}`;
            }
            return '';
        }

        function normalizeId(val) {
            if (val === undefined || val === null || val === '') return '';
            return String(val);
        }

        function showMessage(text, type = 'success') {
            const msg = window.$message;
            if (msg) {
                if (typeof msg[type] === 'function') {
                    msg[type](text);
                    return;
                }
                if (typeof msg.success === 'function') {
                    msg.success(text);
                    return;
                }
            }
            const toast = document.createElement('div');
            toast.className = 'mk-toast-message';
            toast.textContent = text;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2200);
        }

        function getCoverUrl(hash, coverBlob, fallbackImg) {
            if (hash && coverUrlCache.has(hash)) {
                return coverUrlCache.get(hash);
            }
            if (coverBlob instanceof Blob) {
                const url = URL.createObjectURL(coverBlob);
                if (hash) coverUrlCache.set(hash, url);
                return url;
            }
            if (fallbackImg && typeof fallbackImg === 'string') {
                return fallbackImg;
            }
            return DEFAULT_COVER_SVG;
        }

        // ==================== Vue / Pinia / Router / API 兼容层 ====================

        function getVueApp() {
            const appEl = document.querySelector('#app');
            return appEl && appEl.__vue_app__ ? appEl.__vue_app__ : null;
        }

        function getRouter() {
            const app = getVueApp();
            return app?.config?.globalProperties?.$router || null;
        }

        function getCurrentRoute() {
            const router = getRouter();
            if (router?.currentRoute?.value) {
                return router.currentRoute.value;
            }
            const hash = window.location.hash || '';
            const raw = hash.startsWith('#') ? hash.slice(1) : hash;
            const qIdx = raw.indexOf('?');
            const path = qIdx === -1 ? (raw || '/') : raw.slice(0, qIdx);
            const query = {};
            if (qIdx !== -1) {
                const params = new URLSearchParams(raw.slice(qIdx + 1));
                params.forEach((v, k) => {
                    query[k] = v;
                });
            }
            return { path, query };
        }

        function isRoutePath(targetPath) {
            const route = getCurrentRoute();
            const currentPath = (route?.path || '').toLowerCase();
            return currentPath === String(targetPath).toLowerCase();
        }

        function getPiniaStore(storeName) {
            const app = getVueApp();
            if (!app?._context?.provides) return null;
            const provides = app._context.provides;
            const symbols = [
                ...Object.getOwnPropertySymbols(provides),
                ...Object.keys(provides)
            ];
            for (const key of symbols) {
                const val = provides[key];
                if (val && val._s instanceof Map && val._s.has(storeName)) {
                    return val._s.get(storeName);
                }
            }
            return null;
        }

        function getAuthData() {
            const store = getPiniaStore('MoeData');
            if (store?.UserInfo?.userid) {
                return {
                    isAuthenticated: true,
                    UserInfo: store.UserInfo,
                    Device: store.Device || {}
                };
            }
            try {
                const raw = localStorage.getItem('MoeData');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.UserInfo?.userid) {
                        return {
                            isAuthenticated: true,
                            UserInfo: parsed.UserInfo,
                            Device: parsed.Device || {}
                        };
                    }
                }
            } catch (_) {
                // ignore
            }
            return { isAuthenticated: false, UserInfo: null, Device: {} };
        }

        function buildAuthHeaderString() {
            const auth = getAuthData();
            const u = auth.UserInfo || {};
            const d = auth.Device || {};
            const parts = [];
            if (u.token) parts.push(`token=${u.token}`);
            if (u.userid) parts.push(`userid=${u.userid}`);
            if (d.dfid) parts.push(`dfid=${d.dfid}`);
            if (u.t1) parts.push(`t1=${u.t1}`);
            if (d.mid) parts.push(`KUGOU_API_MID=${d.mid}`);
            if (d.guid) parts.push(`KUGOU_API_GUID=${d.guid}`);
            if (d.serverDev) parts.push(`KUGOU_API_DEV=${d.serverDev}`);
            if (d.mac) parts.push(`KUGOU_API_MAC=${d.mac}`);
            return parts.join(';');
        }

        function getApiBaseUrl() {
            try {
                const settings = JSON.parse(localStorage.getItem('settings') || '{}');
                if (settings?.apiBaseUrl && /^https?:\/\//.test(settings.apiBaseUrl)) {
                    return settings.apiBaseUrl.replace(/\/+$/, '');
                }
            } catch (_) {
                // ignore
            }
            return 'http://127.0.0.1:6521';
        }

        async function requestKugouApi(path, params = {}) {
            const authHeader = buildAuthHeaderString();
            const headers = {};
            if (authHeader) {
                headers.Authorization = authHeader;
            }

            if (window.kugouapi && typeof window.kugouapi.request === 'function') {
                try {
                    const res = await window.kugouapi.request(path, { params, headers });
                    const body = res?.body || res?.data || res;
                    if (body && typeof body === 'object') {
                        return body;
                    }
                } catch (_) {
                    // fallback to HTTP fetch
                }
            }

            const baseUrl = getApiBaseUrl();
            const qs = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    qs.set(k, String(v));
                }
            });
            const queryString = qs.toString();
            const fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                credentials: 'include'
            });
            return await response.json();
        }

        function getMusicQueueStore() {
            return getPiniaStore('MusicQueue') || getPiniaStore('musicQueue');
        }

        function findComponentInstances(predicate) {
            const app = getVueApp();
            const rootVNode = app?._container?._vnode || document.querySelector('#app')?._vnode;
            if (!rootVNode) return [];

            const results = [];
            const visitedVNodes = new Set();
            const visitedComponents = new Set();

            function walkVNode(vnode) {
                if (!vnode || typeof vnode !== 'object' || visitedVNodes.has(vnode)) return;
                visitedVNodes.add(vnode);

                if (vnode.component) {
                    walkComponent(vnode.component);
                }
                if (vnode.suspense?.activeBranch) {
                    walkVNode(vnode.suspense.activeBranch);
                }
                if (Array.isArray(vnode.children)) {
                    for (let i = 0; i < vnode.children.length; i++) {
                        walkVNode(vnode.children[i]);
                    }
                }
                if (Array.isArray(vnode.dynamicChildren)) {
                    for (let i = 0; i < vnode.dynamicChildren.length; i++) {
                        walkVNode(vnode.dynamicChildren[i]);
                    }
                }
            }

            function walkComponent(comp) {
                if (!comp || visitedComponents.has(comp)) return;
                visitedComponents.add(comp);
                try {
                    if (predicate(comp)) {
                        results.push(comp);
                    }
                } catch (_) {
                    // ignore
                }
                if (comp.subTree) {
                    walkVNode(comp.subTree);
                }
            }

            walkVNode(rootVNode);
            return results;
        }

        function getPlayerControlInstance() {
            const list = findComponentInstances(
                (c) => c.exposed &&
                    typeof c.exposed.addLocalMusicToQueue === 'function' &&
                    typeof c.exposed.addPlaylistToQueue === 'function'
            );
            return list[0] || null;
        }

        function getPlaylistSelectModalInstances() {
            return findComponentInstances(
                (c) => c.exposed &&
                    typeof c.exposed.toLike === 'function' &&
                    typeof c.exposed.fetchPlaylists === 'function' &&
                    typeof c.exposed.addToPlaylist === 'function'
            );
        }

        function getContextMenuInstances() {
            return findComponentInstances(
                (c) => c.exposed && typeof c.exposed.openContextMenu === 'function'
            );
        }

        function getRecycleScrollerByKeyField(keyField) {
            const trackListEl = document.querySelector('.detail-page .track-list');
            const directComp = trackListEl?.__vueParentComponent;
            if (directComp?.props && Array.isArray(directComp.props.items)) {
                const kf = directComp.props.keyField || directComp.props['key-field'];
                if (!keyField || kf === keyField) {
                    return directComp;
                }
            }
            const list = findComponentInstances(
                (c) => c.props &&
                    Array.isArray(c.props.items) &&
                    (c.props.keyField === keyField || c.props['key-field'] === keyField)
            );
            return list[0] || null;
        }

        function getCurrentPlayingSong() {
            const pc = getPlayerControlInstance();
            const pcSong = pc?.exposed?.currentSong?.value || pc?.exposeProxy?.currentSong || pc?.exposed?.currentSong;
            if (pcSong && typeof pcSong === 'object' && pcSong.hash) {
                return pcSong;
            }
            const modals = getPlaylistSelectModalInstances();
            for (const m of modals) {
                const cs = m.props?.currentSong;
                if (cs && !Array.isArray(cs) && cs.hash) {
                    return cs;
                }
            }
            try {
                const raw = localStorage.getItem('current_song');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.hash) return parsed;
                }
            } catch (_) {
                // ignore
            }
            return null;
        }

        // ==================== IndexedDB 数据库层 ====================

        let pluginDbPromise = null;

        function openPluginDB() {
            if (pluginDbPromise) return pluginDbPromise;
            pluginDbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(PLUGIN_DB_NAME, PLUGIN_DB_VERSION);
                request.onerror = (e) => {
                    pluginDbPromise = null;
                    reject(e.target.error);
                };
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    db.onversionchange = () => {
                        db.close();
                        pluginDbPromise = null;
                    };
                    resolve(db);
                };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_PLAYLIST_TRACKS)) {
                        const trackStore = db.createObjectStore(STORE_PLAYLIST_TRACKS, { keyPath: 'id' });
                        trackStore.createIndex('listid', 'listid', { unique: false });
                        trackStore.createIndex('globalCollectionId', 'globalCollectionId', { unique: false });
                        trackStore.createIndex('hash', 'hash', { unique: false });
                    }
                    if (!db.objectStoreNames.contains(STORE_PLAYLIST_META)) {
                        const metaStore = db.createObjectStore(STORE_PLAYLIST_META, { keyPath: 'listid' });
                        metaStore.createIndex('globalCollectionId', 'globalCollectionId', { unique: false });
                    }
                };
            });
            return pluginDbPromise;
        }

        function openHostLocalMusicDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(HOST_DB_NAME, 2);
                request.onerror = (e) => reject(e.target.error);
                request.onsuccess = (e) => resolve(e.target.result);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(HOST_HANDLE_STORE)) {
                        db.createObjectStore(HOST_HANDLE_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(HOST_TRACK_STORE)) {
                        const store = db.createObjectStore(HOST_TRACK_STORE, { keyPath: 'cacheKey' });
                        store.createIndex('folderId', 'folderId', { unique: false });
                    }
                };
            });
        }

        async function getAllTracksFromHostDB() {
            try {
                const db = await openHostLocalMusicDB();
                if (!db.objectStoreNames.contains(HOST_TRACK_STORE)) return [];
                return await new Promise((resolve) => {
                    const tx = db.transaction([HOST_TRACK_STORE], 'readonly');
                    const req = tx.objectStore(HOST_TRACK_STORE).getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
            } catch (_) {
                return [];
            }
        }

        async function saveHandleToHostDB(hash, handle, name) {
            if (!hash || !handle) return;
            try {
                const db = await openHostLocalMusicDB();
                if (!db.objectStoreNames.contains(HOST_HANDLE_STORE)) return;
                await new Promise((resolve) => {
                    const tx = db.transaction([HOST_HANDLE_STORE], 'readwrite');
                    const store = tx.objectStore(HOST_HANDLE_STORE);
                    store.put({
                        id: 'localSong:' + hash,
                        hash,
                        handle,
                        name: name || '',
                        timestamp: Date.now()
                    });
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                });
            } catch (err) {
                console.warn(PLUGIN_TAG, '保存本地句柄到 LocalMusicDB 失败:', err);
            }
        }

        async function getTrackFromHostDB(hash, nameHint) {
            if (!hash && !nameHint) return null;
            try {
                const db = await openHostLocalMusicDB();
                let trackRecord = null;
                let handleRecord = null;

                if (db.objectStoreNames.contains(HOST_TRACK_STORE)) {
                    const cacheKey = isLocalHash(hash) ? hash.slice('local_'.length) : '';
                    if (cacheKey) {
                        trackRecord = await new Promise((resolve) => {
                            const tx = db.transaction([HOST_TRACK_STORE], 'readonly');
                            const req = tx.objectStore(HOST_TRACK_STORE).get(cacheKey);
                            req.onsuccess = () => resolve(req.result || null);
                            req.onerror = () => resolve(null);
                        });
                    }
                    if (!trackRecord) {
                        trackRecord = await new Promise((resolve) => {
                            const tx = db.transaction([HOST_TRACK_STORE], 'readonly');
                            const req = tx.objectStore(HOST_TRACK_STORE).getAll();
                            req.onsuccess = () => {
                                const all = req.result || [];
                                const found = all.find((t) =>
                                    (hash && t.hash === hash) ||
                                    (nameHint && (t.name === nameHint || t.displayName === nameHint))
                                );
                                resolve(found || null);
                            };
                            req.onerror = () => resolve(null);
                        });
                    }
                }

                const resolvedHash = hash || trackRecord?.hash || '';
                if (resolvedHash && db.objectStoreNames.contains(HOST_HANDLE_STORE)) {
                    handleRecord = await new Promise((resolve) => {
                        const tx = db.transaction([HOST_HANDLE_STORE], 'readonly');
                        const req = tx.objectStore(HOST_HANDLE_STORE).get('localSong:' + resolvedHash);
                        req.onsuccess = () => resolve(req.result || null);
                        req.onerror = () => resolve(null);
                    });
                }

                if (!trackRecord && !handleRecord) return null;
                return {
                    ...(trackRecord || {}),
                    handle: trackRecord?.handle || handleRecord?.handle || null
                };
            } catch (err) {
                console.warn(PLUGIN_TAG, '读取 LocalMusicDB 失败:', err);
                return null;
            }
        }

        async function getTrackFromPluginDBByHash(hash) {
            if (!hash) return null;
            try {
                const db = await openPluginDB();
                return await new Promise((resolve) => {
                    const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readonly');
                    const index = tx.objectStore(STORE_PLAYLIST_TRACKS).index('hash');
                    const req = index.getAll(hash);
                    req.onsuccess = () => {
                        const list = req.result || [];
                        resolve(list[0] || null);
                    };
                    req.onerror = () => resolve(null);
                });
            } catch (_) {
                return null;
            }
        }

        async function resolveFullLocalTrack(songInput) {
            if (!songInput) return null;
            const rawObj = typeof songInput === 'string' ? { hash: songInput } : songInput;
            let hash = getSongHash(rawObj);

            const queueStore = getMusicQueueStore();
            const queueMatch = Array.isArray(queueStore?.queue)
                ? queueStore.queue.find((q) => (hash && q.hash === hash) || (rawObj.name && q.name === rawObj.name && isLocalSong(q)))
                : null;
            if (!hash && queueMatch?.hash) {
                hash = queueMatch.hash;
            }

            const memTrack = hash ? runtimeTrackMap.get(hash) : null;
            const pluginTrack = hash ? await getTrackFromPluginDBByHash(hash) : null;
            const hostTrack = await getTrackFromHostDB(hash, rawObj.name || rawObj.displayName || rawObj.OriSongName);

            if (!hash && hostTrack?.hash) {
                hash = hostTrack.hash;
            }
            if (!hash) return null;

            let parsedName = rawObj.displayName || rawObj.name || '';
            let parsedAuthor = rawObj.author || '';
            if ((!parsedName || !parsedAuthor) && rawObj.OriSongName) {
                const parts = String(rawObj.OriSongName).split(' - ');
                if (parts.length > 1) {
                    if (!parsedAuthor) parsedAuthor = parts[0];
                    if (!parsedName) parsedName = parts.slice(1).join(' - ');
                } else if (!parsedName) {
                    parsedName = rawObj.OriSongName;
                }
            }

            const displayName =
                hostTrack?.displayName ||
                pluginTrack?.displayName ||
                memTrack?.displayName ||
                parsedName ||
                hostTrack?.name ||
                pluginTrack?.name ||
                '未知歌曲';

            const name =
                hostTrack?.name ||
                pluginTrack?.name ||
                memTrack?.name ||
                displayName;

            const author =
                hostTrack?.author ||
                pluginTrack?.author ||
                memTrack?.author ||
                queueMatch?.author ||
                parsedAuthor ||
                '未知艺术家';

            const album =
                hostTrack?.album ||
                pluginTrack?.album ||
                memTrack?.album ||
                rawObj.album ||
                '本地音乐';

            const rawDur = Number(
                hostTrack?.duration ||
                pluginTrack?.duration ||
                memTrack?.duration ||
                rawObj.duration ||
                rawObj.timeLength ||
                queueMatch?.timeLength ||
                rawObj.timelen ||
                0
            );
            const durationSec = rawDur > 3600 ? Math.round(rawDur / 1000) : rawDur;

            const timelenMs = Number(
                hostTrack?.timelen ||
                pluginTrack?.timelen ||
                memTrack?.timelen ||
                (Number(rawObj.timelen) > 3600 ? Number(rawObj.timelen) : 0) ||
                Math.round(durationSec * 1000) ||
                0
            );

            const handle =
                rawObj.handle ||
                memTrack?.handle ||
                hostTrack?.handle ||
                pluginTrack?.handle ||
                queueMatch?.handle ||
                null;

            const coverBlob =
                rawObj.coverBlob ||
                memTrack?.coverBlob ||
                hostTrack?.coverBlob ||
                pluginTrack?.coverBlob ||
                queueMatch?.coverBlob ||
                null;

            const coverState =
                rawObj.coverState ||
                memTrack?.coverState ||
                hostTrack?.coverState ||
                pluginTrack?.coverState ||
                (coverBlob ? 'present' : 'none');

            const qualityInfo =
                rawObj.qualityInfo ||
                memTrack?.qualityInfo ||
                hostTrack?.qualityInfo ||
                pluginTrack?.qualityInfo ||
                null;

            const merged = {
                hash,
                cacheKey: hostTrack?.cacheKey || pluginTrack?.cacheKey || hash.replace(/^local_/, ''),
                folderId: hostTrack?.folderId || pluginTrack?.folderId || '',
                relativePath: hostTrack?.relativePath || pluginTrack?.relativePath || '',
                name,
                displayName,
                author,
                album,
                size: hostTrack?.size || pluginTrack?.size || rawObj.size || 0,
                lastModified: hostTrack?.lastModified || pluginTrack?.lastModified || rawObj.lastModified || 0,
                duration: durationSec,
                timeLength: timelenMs || durationSec,
                timelen: timelenMs,
                bitrate: hostTrack?.bitrate || pluginTrack?.bitrate || 0,
                sampleRate: hostTrack?.sampleRate || pluginTrack?.sampleRate || 0,
                qualityInfo,
                coverBlob,
                coverState,
                handle,
                isLocal: true
            };

            runtimeTrackMap.set(hash, merged);
            if (handle) {
                saveHandleToHostDB(hash, handle, name);
            }
            return merged;
        }

        // ==================== 歌单元数据与本地歌曲存储 ====================

        async function loadPlaylistMetaCacheFromDB() {
            try {
                const db = await openPluginDB();
                const allMeta = await new Promise((resolve) => {
                    const tx = db.transaction([STORE_PLAYLIST_META], 'readonly');
                    const req = tx.objectStore(STORE_PLAYLIST_META).getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
                for (const item of allMeta) {
                    if (item.listid) {
                        playlistMetaCache.set(normalizeId(item.listid), item);
                    }
                    if (item.globalCollectionId && item.listid) {
                        gidToListIdCache.set(normalizeId(item.globalCollectionId), normalizeId(item.listid));
                    }
                }
            } catch (err) {
                console.warn(PLUGIN_TAG, '加载歌单映射缓存失败:', err);
            }
        }

        async function savePlaylistMeta(metaList) {
            if (!Array.isArray(metaList) || metaList.length === 0) return;
            try {
                const db = await openPluginDB();
                await new Promise((resolve) => {
                    const tx = db.transaction([STORE_PLAYLIST_META], 'readwrite');
                    const store = tx.objectStore(STORE_PLAYLIST_META);
                    for (const raw of metaList) {
                        const listid = normalizeId(raw.listid);
                        const globalCollectionId = normalizeId(raw.globalCollectionId || raw.list_create_gid || raw.global_collection_id);
                        const name = raw.name || '';
                        if (!listid) continue;
                        const existing = playlistMetaCache.get(listid) || {};
                        const record = {
                            listid,
                            globalCollectionId: globalCollectionId || existing.globalCollectionId || '',
                            name: name || existing.name || '',
                            updatedAt: Date.now()
                        };
                        playlistMetaCache.set(listid, record);
                        if (record.globalCollectionId) {
                            gidToListIdCache.set(record.globalCollectionId, listid);
                        }
                        store.put(record);
                    }
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                });
            } catch (err) {
                console.warn(PLUGIN_TAG, '保存歌单映射失败:', err);
            }
        }

        function harvestPlaylistLinksFromDOM() {
            const links = document.querySelectorAll('a[href*="PlaylistDetail"], a[href*="playlistDetail"]');
            const found = [];
            links.forEach((a) => {
                const href = a.getAttribute('href') || '';
                const qIndex = href.indexOf('?');
                if (qIndex === -1) return;
                const params = new URLSearchParams(href.slice(qIndex + 1));
                const gid = params.get('global_collection_id');
                const lid = params.get('listid');
                const name =
                    a.querySelector('.album-info h3')?.textContent?.trim() ||
                    a.getAttribute('title')?.trim() ||
                    a.querySelector('span')?.textContent?.trim() ||
                    '';
                if (gid && lid) {
                    found.push({
                        listid: lid,
                        globalCollectionId: gid,
                        name
                    });
                    if (name === '我喜欢') {
                        localStorage.setItem('like', String(lid));
                    }
                }
            });

            if (isRoutePath('/PlaylistDetail')) {
                const route = getCurrentRoute();
                const gid = normalizeId(route?.query?.global_collection_id);
                const coverEl = document.querySelector('.cover-art[data-playlist-id]');
                const lid = normalizeId(route?.query?.listid || coverEl?.getAttribute('data-playlist-id'));
                const titleEl = document.querySelector('.detail-page .title');
                if (lid && gid) {
                    found.push({
                        listid: lid,
                        globalCollectionId: gid,
                        name: titleEl?.textContent?.trim() || ''
                    });
                }
            }

            if (found.length > 0) {
                savePlaylistMeta(found);
            }
            return found;
        }

        async function fetchUserPlaylists(force = false) {
            harvestPlaylistLinksFromDOM();

            const now = Date.now();
            if (!force && userPlaylistsCache.length > 0 && now - lastPlaylistsFetchTime < 15000) {
                return userPlaylistsCache;
            }
            const auth = getAuthData();
            if (auth.isAuthenticated && auth.UserInfo?.userid) {
                try {
                    const resData = await requestKugouApi('/user/playlist', {
                        pagesize: 500,
                        t: localStorage.getItem('t') || Date.now()
                    });
                    if (resData?.status === 1 && Array.isArray(resData?.data?.info)) {
                        const uid = auth.UserInfo.userid;
                        const filtered = resData.data.info
                            .filter((p) => p.list_create_userid === uid || p.name === '我喜欢')
                            .sort((a, b) => (a.name === '我喜欢' ? -1 : b.name === '我喜欢' ? 1 : 0));

                        userPlaylistsCache = filtered;
                        lastPlaylistsFetchTime = now;

                        const likeList = filtered.find((p) => p.name === '我喜欢');
                        if (likeList?.listid) {
                            localStorage.setItem('like', String(likeList.listid));
                        }

                        await savePlaylistMeta(
                            filtered.map((p) => ({
                                listid: p.listid,
                                globalCollectionId: p.list_create_gid || p.global_collection_id || '',
                                name: p.name
                            }))
                        );
                        return userPlaylistsCache;
                    }
                } catch (err) {
                    console.warn(PLUGIN_TAG, '获取用户歌单列表失败:', err);
                }
            }

            if (userPlaylistsCache.length === 0 && playlistMetaCache.size > 0) {
                userPlaylistsCache = Array.from(playlistMetaCache.values())
                    .filter((m) => m.name)
                    .map((m) => ({
                        listid: m.listid,
                        list_create_gid: m.globalCollectionId,
                        global_collection_id: m.globalCollectionId,
                        name: m.name
                    }))
                    .sort((a, b) => (a.name === '我喜欢' ? -1 : b.name === '我喜欢' ? 1 : 0));
            }
            return userPlaylistsCache;
        }

        async function resolvePlaylistIds(listidInput, gidInput, nameHint = '') {
            let listid = normalizeId(listidInput);
            let globalCollectionId = normalizeId(gidInput);
            let name = nameHint || '';

            harvestPlaylistLinksFromDOM();

            if (listid && !globalCollectionId) {
                const meta = playlistMetaCache.get(listid);
                if (meta?.globalCollectionId) {
                    globalCollectionId = meta.globalCollectionId;
                    if (!name) name = meta.name || '';
                }
            }
            if (globalCollectionId && !listid) {
                const cachedLid = gidToListIdCache.get(globalCollectionId);
                if (cachedLid) {
                    listid = cachedLid;
                    const meta = playlistMetaCache.get(listid);
                    if (!name && meta?.name) name = meta.name;
                }
            }

            if (!listid || !globalCollectionId) {
                const playlists = await fetchUserPlaylists();
                for (const p of playlists) {
                    const pLid = normalizeId(p.listid);
                    const pGid = normalizeId(p.list_create_gid || p.global_collection_id);
                    if ((listid && pLid === listid) || (globalCollectionId && pGid === globalCollectionId) || (name && p.name === name)) {
                        if (!listid) listid = pLid;
                        if (!globalCollectionId) globalCollectionId = pGid;
                        if (!name) name = p.name;
                        break;
                    }
                }
            }

            if (listid) {
                await savePlaylistMeta([{ listid, globalCollectionId, name }]);
            }

            return { listid, globalCollectionId, name };
        }

        async function getLocalTracksForPlaylist(listidInput, gidInput) {
            const { listid, globalCollectionId } = await resolvePlaylistIds(listidInput, gidInput);
            if (!listid && !globalCollectionId) return [];

            try {
                const db = await openPluginDB();
                const recordsByListId = listid
                    ? await new Promise((resolve) => {
                        const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readonly');
                        const req = tx.objectStore(STORE_PLAYLIST_TRACKS).index('listid').getAll(listid);
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    })
                    : [];

                const recordsByGid = globalCollectionId
                    ? await new Promise((resolve) => {
                        const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readonly');
                        const req = tx.objectStore(STORE_PLAYLIST_TRACKS).index('globalCollectionId').getAll(globalCollectionId);
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    })
                    : [];

                const map = new Map();
                const toHeal = [];

                for (const rec of [...recordsByListId, ...recordsByGid]) {
                    if (!rec || !rec.hash) continue;
                    if (!map.has(rec.hash)) {
                        if ((listid && rec.listid !== listid) || (globalCollectionId && rec.globalCollectionId !== globalCollectionId)) {
                            rec.listid = listid || rec.listid || '';
                            rec.globalCollectionId = globalCollectionId || rec.globalCollectionId || '';
                            toHeal.push(rec);
                        }
                        map.set(rec.hash, rec);
                        runtimeTrackMap.set(rec.hash, rec);
                    }
                }

                if (toHeal.length > 0) {
                    const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readwrite');
                    const store = tx.objectStore(STORE_PLAYLIST_TRACKS);
                    for (const rec of toHeal) {
                        store.put(rec);
                    }
                }

                const result = Array.from(map.values());
                result.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
                return result;
            } catch (err) {
                console.warn(PLUGIN_TAG, '查询歌单本地歌曲失败:', err);
                return [];
            }
        }

        async function addLocalSongsToPlaylist(listidInput, songsInput, playlistInfo = {}) {
            const rawList = Array.isArray(songsInput) ? songsInput : [songsInput];
            const localCandidates = rawList.filter(Boolean);
            if (localCandidates.length === 0) return { added: 0, skipped: 0 };

            const { listid, globalCollectionId, name: playlistName } = await resolvePlaylistIds(
                listidInput || playlistInfo.listid,
                playlistInfo.globalCollectionId || playlistInfo.list_create_gid || playlistInfo.global_collection_id,
                playlistInfo.name
            );

            const targetKey = listid || globalCollectionId;
            if (!targetKey) {
                showMessage('未能识别目标歌单，请先登录', 'error');
                return { added: 0, skipped: 0 };
            }

            const existingTracks = await getLocalTracksForPlaylist(listid, globalCollectionId);
            const existingHashes = new Set(existingTracks.map((t) => t.hash));

            const recordsToSave = [];
            let skipped = 0;
            const baseTime = Date.now();

            for (let i = 0; i < localCandidates.length; i++) {
                const fullTrack = await resolveFullLocalTrack(localCandidates[i]);
                if (!fullTrack || !fullTrack.hash) continue;

                if (existingHashes.has(fullTrack.hash)) {
                    skipped++;
                    continue;
                }
                existingHashes.add(fullTrack.hash);

                const record = {
                    ...fullTrack,
                    id: `${targetKey}::${fullTrack.hash}`,
                    listid: listid || '',
                    globalCollectionId: globalCollectionId || '',
                    playlistName: playlistName || playlistInfo.name || '',
                    addedAt: baseTime + (localCandidates.length - i)
                };
                recordsToSave.push(record);
            }

            if (recordsToSave.length === 0) {
                if (skipped > 0) {
                    showMessage('本地歌曲已在歌单中', 'info');
                }
                return { added: 0, skipped };
            }

            const db = await openPluginDB();
            await new Promise((resolve, reject) => {
                const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readwrite');
                const store = tx.objectStore(STORE_PLAYLIST_TRACKS);
                for (const rec of recordsToSave) {
                    store.put(rec);
                }
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(e.target.error);
            });

            for (const rec of recordsToSave) {
                if (rec.handle) {
                    await saveHandleToHostDB(rec.hash, rec.handle, rec.name);
                }
            }

            schedulePlaylistDetailSync(true);
            scheduleLibraryCountSync();

            return { added: recordsToSave.length, skipped };
        }

        async function removeLocalSongsFromPlaylist(listidInput, gidInput, hashesInput) {
            const hashes = new Set((Array.isArray(hashesInput) ? hashesInput : [hashesInput]).filter(Boolean));
            if (hashes.size === 0) return 0;

            const { listid, globalCollectionId } = await resolvePlaylistIds(listidInput, gidInput);
            const existing = await getLocalTracksForPlaylist(listid, globalCollectionId);
            const toDeleteIds = existing.filter((t) => hashes.has(t.hash)).map((t) => t.id);

            if (toDeleteIds.length === 0) return 0;

            const db = await openPluginDB();
            await new Promise((resolve) => {
                const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readwrite');
                const store = tx.objectStore(STORE_PLAYLIST_TRACKS);
                for (const id of toDeleteIds) {
                    store.delete(id);
                }
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });

            scheduleLibraryCountSync();
            return toDeleteIds.length;
        }

        // ==================== 文件系统权限恢复 ====================

        let isPermissionPromptOpen = false;

        async function unlockHostFoldersWithGesture() {
            try {
                const db = await openHostLocalMusicDB();
                if (!db.objectStoreNames.contains(HOST_HANDLE_STORE)) return;

                const lastFolder = await new Promise((resolve) => {
                    const tx = db.transaction([HOST_HANDLE_STORE], 'readonly');
                    const req = tx.objectStore(HOST_HANDLE_STORE).get('lastSelectedFolder');
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                });

                if (lastFolder?.handle && typeof lastFolder.handle.queryPermission === 'function') {
                    const state = await lastFolder.handle.queryPermission({ mode: 'read' });
                    if (state !== 'granted') {
                        await lastFolder.handle.requestPermission({ mode: 'read' });
                    }
                }
            } catch (_) {
                // ignore
            }
        }

        function installFileSystemPermissionHook() {
            if (typeof window.FileSystemHandle === 'undefined') return;
            const proto = window.FileSystemHandle.prototype;
            if (!proto || proto.__mkPermissionHooked) return;

            const origRequestPermission = proto.requestPermission;
            if (typeof origRequestPermission !== 'function') return;

            proto.requestPermission = async function (descriptor = { mode: 'read' }) {
                try {
                    if (typeof this.queryPermission === 'function') {
                        const current = await this.queryPermission(descriptor);
                        if (current === 'granted') return 'granted';
                    }
                } catch (_) {
                    // continue
                }

                if (navigator.userActivation?.isActive) {
                    try {
                        const res = await origRequestPermission.call(this, descriptor);
                        if (res === 'granted') return 'granted';
                    } catch (_) {
                        // fall through
                    }
                }

                if (window.$modal && typeof window.$modal.confirm === 'function' && !isPermissionPromptOpen) {
                    isPermissionPromptOpen = true;
                    try {
                        const label = this.name ? `「${this.name}」` : '本地音乐文件';
                        const confirmed = await window.$modal.confirm(
                            `播放 ${label} 需要恢复本地音乐读取权限，是否立即授权？`
                        );
                        if (confirmed) {
                            const state = await origRequestPermission.call(this, descriptor);
                            unlockHostFoldersWithGesture();
                            return state;
                        }
                    } catch (err) {
                        console.warn(PLUGIN_TAG, '弹窗请求文件权限失败:', err);
                    } finally {
                        isPermissionPromptOpen = false;
                    }
                }

                return origRequestPermission.call(this, descriptor);
            };

            proto.__mkPermissionHooked = true;
        }

        // ==================== PlaylistDetail.vue 本地歌曲无缝合并 ====================

        function formatLocalTrackForPlaylistDetail(record, index) {
            const displayName = record.displayName || record.name || '未知歌曲';
            const author = record.author || '未知艺术家';
            const durationSec = Number(record.duration || (record.timelen ? record.timelen / 1000 : 0) || 0);
            const timelenMs = Number(record.timelen || Math.round(durationSec * 1000) || 0);
            const badge = record.qualityInfo?.badge || record.qualityInfo?.text || '';
            const label = record.qualityInfo?.label || '';
            const coverUrl = getCoverUrl(record.hash, record.coverBlob, record.cover);

            return {
                hash: record.hash,
                OriSongName: `${author} - ${displayName}`,
                name: displayName,
                author,
                album: record.album || '本地音乐',
                cover: coverUrl,
                img: coverUrl,
                timelen: timelenMs,
                timeLength: timelenMs || durationSec,
                duration: durationSec,
                isSQ: badge === 'SQ' || badge === 'HR' || label === '无损',
                isHQ: badge === 'HQ' || label === '高品质',
                mvhash: '',
                trackKey: `${record.hash}_local_${index}`,
                isLocal: true,
                displayName,
                handle: record.handle || null,
                coverBlob: record.coverBlob || null,
                coverState: record.coverState || (record.coverBlob ? 'present' : 'none'),
                qualityInfo: record.qualityInfo || null,
                addedAt: record.addedAt || 0,
                originalData: {
                    hash: record.hash,
                    name: `${author} - ${displayName}`,
                    timelen: timelenMs,
                    fileid: `local_fileid_${record.hash}`,
                    isLocal: true
                }
            };
        }

        let isSyncingPlaylistDetail = false;
        let syncDetailTimer = null;
        const detailOverlays = new WeakMap();

        // The host uses the original array to count and paginate remote tracks.
        // Expose a separate list to the scroller so local tracks cannot change it.
        function getDetailOverlay(scroller) {
            let state = detailOverlays.get(scroller);
            if (state) return state;
            const props = scroller?.props;
            if (!props || !Array.isArray(props.items)) return null;
            const descriptor = Object.getOwnPropertyDescriptor(props, 'items');
            if (descriptor && !descriptor.configurable) return null;
            state = { source: props.items, locals: [] };
            Object.defineProperty(props, 'items', {
                configurable: true,
                enumerable: true,
                get() { return state.locals.length ? [...state.locals, ...state.source] : state.source; },
                set(value) { state.source = Array.isArray(value) ? value : []; }
            });
            detailOverlays.set(scroller, state);
            return state;
        }

        function schedulePlaylistDetailSync(immediate = false) {
            if (immediate) {
                if (syncDetailTimer) clearTimeout(syncDetailTimer);
                syncDetailTimer = null;
                syncPlaylistDetailTracks();
            } else if (!syncDetailTimer) {
                // Frequent DOM changes must not indefinitely postpone synchronization.
                syncDetailTimer = setTimeout(() => {
                    syncDetailTimer = null;
                    syncPlaylistDetailTracks();
                }, 120);
            }
        }

        async function syncPlaylistDetailTracks() {
            if (isSyncingPlaylistDetail) return;
            if (!isRoutePath('/PlaylistDetail')) return;

            const route = getCurrentRoute();
            const query = route?.query || {};
            if (query.singerid || query.albumid) return;
            const gid = normalizeId(query.global_collection_id);
            if (!gid) return;

            if (document.querySelector('.detail-page .skeleton-loader')) return;
            if (document.querySelector('.detail-page .search-loading-spinner')) return;

            const scroller = getRecycleScrollerByKeyField('trackKey');
            if (!scroller || !Array.isArray(scroller.props?.items)) return;

            const coverEl = document.querySelector('.cover-art[data-playlist-id]');
            const domListId = normalizeId(coverEl?.getAttribute('data-playlist-id'));
            const listid = normalizeId(query.listid || domListId);

            isSyncingPlaylistDetail = true;
            try {
                const localRecords = await getLocalTracksForPlaylist(listid, gid);
                const currentRoute = getCurrentRoute();
                if (!isRoutePath('/PlaylistDetail') ||
                    normalizeId(currentRoute?.query?.global_collection_id) !== gid ||
                    normalizeId(currentRoute?.query?.listid || domListId) !== listid ||
                    getRecycleScrollerByKeyField('trackKey') !== scroller) return;
                const overlay = getDetailOverlay(scroller);
                if (!overlay) return;

                const searchInput = document.querySelector('.detail-page .search-input');
                const searchQuery = (searchInput?.value || '').trim().toLowerCase();

                const matchingLocalRecords = searchQuery
                    ? localRecords.filter((rec) => {
                        const n = (rec.displayName || rec.name || '').toLowerCase().trim();
                        const a = (rec.author || '').toLowerCase().trim();
                        return n.includes(searchQuery) || a.includes(searchQuery);
                    })
                    : localRecords;

                const currentLocalHashes = new Set(overlay.locals.map((it) => it.hash));
                const targetLocalHashes = new Set(matchingLocalRecords.map((r) => r.hash));

                let needsUpdate = currentLocalHashes.size !== targetLocalHashes.size;
                if (!needsUpdate) {
                    for (const h of targetLocalHashes) {
                        if (!currentLocalHashes.has(h)) {
                            needsUpdate = true;
                            break;
                        }
                    }
                }

                if (needsUpdate) {
                    overlay.locals = matchingLocalRecords.map((rec, idx) =>
                        formatLocalTrackForPlaylistDetail(rec, idx)
                    );
                    // Changing the overlay does not mutate the host's reactive array.
                    scroller.update?.();
                    try {
                        scroller.proxy?.updateVisibleItems?.(true);
                    } catch (_) {
                        // ignore
                    }
                }

                updatePlaylistDetailHeaderCount(overlay.source.length + overlay.locals.length, localRecords.length);
            } catch (err) {
                console.warn(PLUGIN_TAG, '同步歌单详情页本地歌曲失败:', err);
            } finally {
                isSyncingPlaylistDetail = false;
            }
        }

        function updatePlaylistDetailHeaderCount(loadedCount, localCount) {
            const titleEl = document.querySelector('.detail-page .track-list-title');
            if (!titleEl || localCount <= 0) return;

            const text = titleEl.textContent || '';
            const matchRatio = text.match(/\((\d+)\/(\d+)\)/);
            if (matchRatio) {
                const baseTotal = Number(titleEl.getAttribute('data-mk-base-total') || matchRatio[2]);
                if (!titleEl.getAttribute('data-mk-base-total')) {
                    titleEl.setAttribute('data-mk-base-total', String(baseTotal));
                }
                const newTotal = baseTotal + localCount;
                const prefix = text.split('(')[0];
                titleEl.textContent = `${prefix}(${loadedCount}/${newTotal})`;
            } else {
                const matchSingle = text.match(/\(\s*(\d+)\s*\)/);
                if (matchSingle) {
                    const prefix = text.split('(')[0];
                    titleEl.textContent = `${prefix}( ${loadedCount} )`;
                }
            }
        }

        async function scheduleLibraryCountSync() {
            if (!isRoutePath('/library')) return;

            try {
                const db = await openPluginDB();
                const allTracks = await new Promise((resolve) => {
                    const tx = db.transaction([STORE_PLAYLIST_TRACKS], 'readonly');
                    const req = tx.objectStore(STORE_PLAYLIST_TRACKS).getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });

                const countByGid = new Map();
                const countByLid = new Map();
                for (const rec of allTracks) {
                    if (rec.globalCollectionId) {
                        countByGid.set(rec.globalCollectionId, (countByGid.get(rec.globalCollectionId) || 0) + 1);
                    }
                    if (rec.listid) {
                        countByLid.set(rec.listid, (countByLid.get(rec.listid) || 0) + 1);
                    }
                }

                const cards = document.querySelectorAll('.music-card a[href*="PlaylistDetail"], .music-card a[href*="playlistDetail"]');
                cards.forEach((a) => {
                    const href = a.getAttribute('href') || '';
                    const qIndex = href.indexOf('?');
                    if (qIndex === -1) return;
                    const params = new URLSearchParams(href.slice(qIndex + 1));
                    const gid = normalizeId(params.get('global_collection_id'));
                    const lid = normalizeId(params.get('listid'));
                    const localCount = (gid && countByGid.get(gid)) || (lid && countByLid.get(lid)) || 0;

                    const subEl = a.querySelector('.album-info p');
                    if (!subEl) return;
                    const text = subEl.textContent || '';
                    const match = text.match(/^(\d+)\s*(.*)$/);
                    if (!match) return;

                    if (!subEl.hasAttribute('data-mk-base-count')) {
                        subEl.setAttribute('data-mk-base-count', match[1]);
                    }
                    const baseCount = Number(subEl.getAttribute('data-mk-base-count') || 0);
                    const spanEl = subEl.querySelector('span');
                    const unitText = spanEl ? spanEl.outerHTML : (match[2] || '首歌');
                    subEl.innerHTML = `${baseCount + localCount} ${unitText}`;
                });
            } catch (_) {
                // ignore
            }
        }

        // ==================== PlayerControl 拦截与混合队列/随机播放 ====================

        function hookPlayerControl() {
            const pc = getPlayerControlInstance();
            if (!pc || !pc.exposed || pc.exposed.__mkLocalPlaylistHooked) return;

            const exposed = pc.exposed;
            const origAddSongToQueue = exposed.addSongToQueue.bind(exposed);
            const origAddLocalMusicToQueue = exposed.addLocalMusicToQueue.bind(exposed);
            const origAddLocalPlaylistToQueue = exposed.addLocalPlaylistToQueue.bind(exposed);
            const origAddPlaylistToQueue = exposed.addPlaylistToQueue.bind(exposed);
            const origAddToNext = exposed.addToNext.bind(exposed);
            let playbackGeneration = 0;

            exposed.addSongToQueue = async function (hash, name, img, author, isReset = true) {
                if (isReset) playbackGeneration++;
                if (isLocalHash(hash)) {
                    const fullTrack = await resolveFullLocalTrack({ hash, name, img, author });
                    if (!fullTrack) {
                        showMessage('未找到该本地音乐记录，请先在「本地音乐」页面扫描文件夹', 'error');
                        return { error: true };
                    }
                    if (navigator.userActivation?.isActive && fullTrack.handle?.requestPermission) {
                        try {
                            const p = await fullTrack.handle.queryPermission({ mode: 'read' });
                            if (p !== 'granted') {
                                await fullTrack.handle.requestPermission({ mode: 'read' });
                            }
                        } catch (_) {
                            // ignore
                        }
                    }
                    return await origAddLocalMusicToQueue(fullTrack, isReset);
                }
                return origAddSongToQueue(hash, name, img, author, isReset);
            };

            exposed.addLocalMusicToQueue = async function (localSong, isReset = true) {
                if (isReset) playbackGeneration++;
                if (localSong) {
                    const hash = getSongHash(localSong);
                    if (hash) {
                        runtimeTrackMap.set(hash, { ...localSong, hash, isLocal: true });
                        if (localSong.handle) {
                            saveHandleToHostDB(hash, localSong.handle, localSong.name);
                        }
                    }
                }
                return await origAddLocalMusicToQueue(localSong, isReset);
            };

            exposed.addLocalPlaylistToQueue = async function (localSongs, append = false) {
                if (!append) playbackGeneration++;
                if (Array.isArray(localSongs)) {
                    for (const s of localSongs) {
                        const h = getSongHash(s);
                        if (h) {
                            runtimeTrackMap.set(h, { ...s, hash: h, isLocal: true });
                            if (s.handle) saveHandleToHostDB(h, s.handle, s.name);
                        }
                    }
                }

                if (interceptNextLocalBatchAction && Array.isArray(localSongs)) {
                    const action = interceptNextLocalBatchAction;
                    interceptNextLocalBatchAction = null;
                    if (action === 'like') {
                        await handleBatchAddLocalToLike(localSongs);
                    } else if (action === 'playlist') {
                        await openCustomPlaylistPickerModal(localSongs);
                    }
                    return [];
                }

                return await origAddLocalPlaylistToQueue(localSongs, append);
            };

            exposed.addPlaylistToQueue = async function (info, append = false) {
                const generation = append ? playbackGeneration : ++playbackGeneration;
                if (isRoutePath('/PlaylistDetail')) {
                    const scroller = getRecycleScrollerByKeyField('trackKey');
                    const overlay = scroller && detailOverlays.get(scroller);
                    // Play-all passes the host's original filtered array. Background
                    // pagination passes a different array and must not add locals again.
                    if (overlay && info === overlay.source && overlay.locals.length) {
                        info = [...overlay.locals, ...info];
                    }
                }
                if (!Array.isArray(info) || info.length === 0) {
                    return origAddPlaylistToQueue(info, append);
                }

                const hasLocal = info.some((s) => isLocalSong(s));
                if (!hasLocal) {
                    return origAddPlaylistToQueue(info, append);
                }

                if (navigator.userActivation?.isActive) {
                    unlockHostFoldersWithGesture();
                }

                const queueStore = getMusicQueueStore();
                if (!append && queueStore && typeof queueStore.clearQueue === 'function') {
                    queueStore.clearQueue();
                }

                await origAddPlaylistToQueue(info, true);

                if (Array.isArray(queueStore?.queue)) {
                    for (let i = 0; i < queueStore.queue.length; i++) {
                        const qItem = queueStore.queue[i];
                        if (isLocalSong(qItem)) {
                            const fullTrack = await resolveFullLocalTrack(qItem);
                            if (generation !== playbackGeneration || !queueStore.queue.includes(qItem)) return queueStore.queue;
                            if (fullTrack) {
                                const coverUrl = getCoverUrl(fullTrack.hash, fullTrack.coverBlob, qItem.img);
                                qItem.isLocal = true;
                                qItem.name = fullTrack.displayName || fullTrack.name || qItem.name;
                                qItem.displayName = fullTrack.displayName || fullTrack.name;
                                qItem.author = fullTrack.author || qItem.author || '未知艺术家';
                                qItem.album = fullTrack.album || '本地音乐';
                                qItem.timeLength = Number(fullTrack.timelen || fullTrack.duration || qItem.timeLength || 0);
                                qItem.handle = fullTrack.handle || qItem.handle || null;
                                qItem.coverBlob = fullTrack.coverBlob || qItem.coverBlob || null;
                                qItem.coverState = fullTrack.coverState || (fullTrack.coverBlob ? 'present' : 'none');
                                qItem.img = coverUrl;
                            } else {
                                qItem.isLocal = true;
                            }
                        }
                    }
                }

                if (!append && generation === playbackGeneration && Array.isArray(queueStore?.queue) && queueStore.queue.length > 0) {
                    const playbackMode = Number(localStorage.getItem('player_playback_mode') || 2);
                    let targetIndex = 0;
                    if (playbackMode === 0) {
                        targetIndex = Math.floor(Math.random() * queueStore.queue.length);
                    }
                    const targetSong = queueStore.queue[targetIndex];
                    if (targetSong) {
                        if (isLocalSong(targetSong)) {
                            await exposed.addLocalMusicToQueue(targetSong, true);
                        } else {
                            await origAddSongToQueue(
                                targetSong.hash,
                                targetSong.name,
                                targetSong.img,
                                targetSong.author,
                                true
                            );
                        }
                    }
                }
                return queueStore?.queue || [];
            };

            exposed.addToNext = async function (hash, name, img, author, timeLength) {
                if (isLocalHash(hash)) {
                    const fullTrack = await resolveFullLocalTrack({ hash, name, img, author, timeLength });
                    const queueStore = getMusicQueueStore();
                    if (!queueStore || !Array.isArray(queueStore.queue)) {
                        return;
                    }
                    const currentSong = getCurrentPlayingSong();
                    const currentHash = currentSong?.hash;
                    const currentIndex = queueStore.queue.findIndex((s) => s.hash === currentHash);
                    const coverUrl = getCoverUrl(hash, fullTrack?.coverBlob, img);

                    const queueItem = {
                        id: queueStore.queue.length + 1 + Math.floor(Math.random() * 10000),
                        hash,
                        name: fullTrack?.displayName || fullTrack?.name || name || '未知歌曲',
                        displayName: fullTrack?.displayName || fullTrack?.name || name || '未知歌曲',
                        img: coverUrl,
                        author: fullTrack?.author || author || '未知艺术家',
                        timeLength: Number(fullTrack?.timelen || fullTrack?.duration || timeLength || 0),
                        album: fullTrack?.album || '本地音乐',
                        isLocal: true,
                        handle: fullTrack?.handle || null,
                        coverBlob: fullTrack?.coverBlob || null,
                        coverState: fullTrack?.coverState || (fullTrack?.coverBlob ? 'present' : 'none')
                    };

                    const insertIndex = currentIndex !== -1 ? currentIndex + 1 : queueStore.queue.length;
                    queueStore.queue.splice(insertIndex, 0, queueItem);
                    return;
                }
                return origAddToNext(hash, name, img, author, timeLength);
            };

            exposed.__mkLocalPlaylistHooked = true;
        }

        // ==================== PlaylistSelectModal & 底部播放栏按钮同步拦截 ====================

        function hookPlaylistSelectModals() {
            const modals = getPlaylistSelectModalInstances();
            for (const modal of modals) {
                if (!modal.exposed || modal.exposed.__mkLocalPlaylistHooked) continue;

                const exposed = modal.exposed;
                const origToLike = exposed.toLike.bind(exposed);
                const origFetchPlaylists = exposed.fetchPlaylists.bind(exposed);

                exposed.toLike = async function () {
                    const currentSong = modal.props?.currentSong || getCurrentPlayingSong();
                    if (isLocalSong(currentSong)) {
                        await handleBatchAddLocalToLike([currentSong]);
                        return;
                    }
                    return origToLike();
                };

                exposed.fetchPlaylists = async function () {
                    const currentSong = modal.props?.currentSong;

                    if (isPeekingSelectedSongs) {
                        peekedSelectedSongs = Array.isArray(currentSong) ? [...currentSong] : currentSong;
                        return;
                    }

                    fetchUserPlaylists();
                    return origFetchPlaylists();
                };

                modal.exposed.__mkLocalPlaylistHooked = true;
            }
        }

        // 在捕获阶段同步拦截：1. 底部播放栏心形/加号按钮 2. 原生收藏弹窗列表项点击
        function installPlaylistSelectModalClickInterceptor() {
            document.addEventListener('click', (event) => {
                // 拦截 1：底部播放栏或歌词页的“我喜欢”心形按钮 & “收藏至”加号按钮
                const playerBtn = event.target?.closest?.('.player-bar .extra-btn, .lyrics-screen .like-btn, .control-btn.like-btn');
                if (playerBtn) {
                    const isHeartBtn = !!playerBtn.querySelector('.fa-heart') || playerBtn.classList.contains('like-btn');
                    const isPlusBtn = !!playerBtn.querySelector('.fa-plus');
                    if (isHeartBtn || isPlusBtn) {
                        const playingSong = getCurrentPlayingSong();
                        if (isLocalSong(playingSong)) {
                            event.stopImmediatePropagation();
                            event.preventDefault();
                            if (isHeartBtn) {
                                handleBatchAddLocalToLike([playingSong]);
                            } else {
                                openCustomPlaylistPickerModal([playingSong]);
                            }
                            return;
                        }
                    }
                }

                // 拦截 2：原生 PlaylistSelectModal 弹窗内的歌单 <li> 点击
                const li = event.target?.closest?.('.modal .playlist-select-list li');
                if (!li) return;

                const modals = getPlaylistSelectModalInstances();
                const activeModal = modals.find((m) => m.props?.currentSong) || modals[0];
                const currentSong = activeModal?.props?.currentSong || getCurrentPlayingSong();
                if (!currentSong) return;

                const playlistName = (li.textContent || '').trim();
                const ul = li.parentElement;
                const liIndex = ul ? Array.from(ul.children).indexOf(li) : -1;

                if (!Array.isArray(currentSong) && isLocalSong(currentSong)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();

                    const closeBtn = li.closest('.modal')?.querySelector('.close-btn-modal');
                    closeBtn?.click();

                    (async () => {
                        const playlists = await fetchUserPlaylists();
                        const targetPlaylist =
                            playlists.find((p) => p.name === playlistName) ||
                            (liIndex >= 0 ? playlists[liIndex] : null);
                        if (!targetPlaylist) return;

                        const { added } = await addLocalSongsToPlaylist(
                            targetPlaylist.listid,
                            [currentSong],
                            targetPlaylist
                        );
                        if (added > 0) {
                            showMessage(`成功添加到「${targetPlaylist.name}」`, 'success');
                        }
                    })();
                    return;
                }

                if (Array.isArray(currentSong)) {
                    const localSongs = currentSong.filter((s) => isLocalSong(s));
                    const onlineSongs = currentSong.filter((s) => !isLocalSong(s));

                    if (localSongs.length === 0) {
                        return;
                    }

                    if (onlineSongs.length === 0) {
                        event.stopImmediatePropagation();
                        event.preventDefault();

                        const closeBtn = li.closest('.modal')?.querySelector('.close-btn-modal');
                        closeBtn?.click();

                        (async () => {
                            const playlists = await fetchUserPlaylists();
                            const targetPlaylist =
                                playlists.find((p) => p.name === playlistName) ||
                                (liIndex >= 0 ? playlists[liIndex] : null);
                            if (!targetPlaylist) return;

                            const { added, skipped } = await addLocalSongsToPlaylist(
                                targetPlaylist.listid,
                                localSongs,
                                targetPlaylist
                            );
                            if (added > 0) {
                                showMessage(`已将 ${added} 首本地歌曲添加到「${targetPlaylist.name}」`, 'success');
                            } else if (skipped > 0) {
                                showMessage('选中的本地歌曲已在歌单中', 'info');
                            }
                        })();
                        return;
                    }

                    currentSong.splice(0, currentSong.length, ...onlineSongs);
                    (async () => {
                        const playlists = await fetchUserPlaylists();
                        const targetPlaylist =
                            playlists.find((p) => p.name === playlistName) ||
                            (liIndex >= 0 ? playlists[liIndex] : null);
                        if (targetPlaylist) {
                            await addLocalSongsToPlaylist(targetPlaylist.listid, localSongs, targetPlaylist);
                        }
                    })();
                }
            }, true);
        }

        // ==================== ContextMenu 拦截 ====================

        function hookContextMenus() {
            const menus = getContextMenuInstances();
            for (const menu of menus) {
                if (!menu.exposed || menu.exposed.__mkLocalPlaylistHooked) continue;

                const origOpenContextMenu = menu.exposed.openContextMenu.bind(menu.exposed);
                menu.exposed.openContextMenu = function (event, song, listId) {
                    lastContextSong = song;
                    lastContextListId = listId;
                    lastContextMenuInstance = menu;

                    if (isLocalSong(song) && listId) {
                        const auth = getAuthData();
                        if (auth.isAuthenticated && auth.UserInfo?.userid && !song.userid) {
                            song.userid = auth.UserInfo.userid;
                        }
                    }

                    return origOpenContextMenu(event, song, listId);
                };

                menu.exposed.__mkLocalPlaylistHooked = true;
            }
        }

        function installContextMenuClickInterceptor() {
            document.addEventListener('click', (event) => {
                const menuEl = event.target?.closest?.('.context-menu');
                if (!menuEl || !lastContextSong || !isLocalSong(lastContextSong)) return;

                const li = event.target?.closest?.('li');
                if (!li) return;

                const hash = lastContextSong.FileHash || lastContextSong.hash;
                if (!isLocalHash(hash)) return;

                const songSnapshot = { ...lastContextSong };
                const listIdSnapshot = lastContextListId;
                const menuInstanceSnapshot = lastContextMenuInstance;

                const submenu = li.closest('.submenu');
                if (submenu) {
                    event.stopImmediatePropagation();
                    event.preventDefault();

                    const playlistName = (li.textContent || '').trim();
                    const liIndex = Array.from(submenu.children).indexOf(li);
                    document.body.click();

                    (async () => {
                        const playlists = await fetchUserPlaylists();
                        const targetPlaylist =
                            playlists.find((p) => p.name === playlistName) ||
                            (liIndex >= 0 ? playlists[liIndex] : null);

                        if (targetPlaylist) {
                            const { added } = await addLocalSongsToPlaylist(
                                targetPlaylist.listid,
                                [songSnapshot],
                                targetPlaylist
                            );
                            if (added > 0) {
                                showMessage('成功添加到歌单', 'success');
                            }
                        }
                    })();
                    return;
                }

                if (li.querySelector('.fa-heart')) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    document.body.click();

                    (async () => {
                        const route = getCurrentRoute();
                        const gid = normalizeId(route?.query?.global_collection_id);
                        await removeLocalSongsFromPlaylist(listIdSnapshot, gid, [hash]);

                        if (menuInstanceSnapshot && typeof menuInstanceSnapshot.emit === 'function') {
                            menuInstanceSnapshot.emit('songRemoved', songSnapshot.fileid || `local_fileid_${hash}`);
                        } else {
                            const scroller = getRecycleScrollerByKeyField('trackKey');
                            const items = scroller?.props?.items;
                            if (Array.isArray(items)) {
                                const idx = items.findIndex((t) => t.hash === hash);
                                if (idx !== -1) items.splice(idx, 1);
                            }
                        }

                        showMessage('成功取消收藏', 'success');
                    })();
                    return;
                }

                if (li.querySelector('.fa-arrow-right')) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    document.body.click();

                    (async () => {
                        const pc = getPlayerControlInstance();
                        const parts = String(songSnapshot.OriSongName || '').split(' - ');
                        const songAuthor = parts.length > 1 ? parts[0] : (songSnapshot.author || '未知艺术家');
                        const songName = parts.length > 1 ? parts.slice(1).join(' - ') : (songSnapshot.name || parts[0] || '未知歌曲');
                        if (pc?.exposed?.addToNext) {
                            await pc.exposed.addToNext(
                                hash,
                                songName,
                                songSnapshot.cover,
                                songAuthor,
                                songSnapshot.timeLength || songSnapshot.timelen || 0
                            );
                            showMessage('添加成功', 'success');
                        }
                    })();
                }
            }, true);
        }

        function installBatchRemoveInterceptor() {
            document.addEventListener('click', (event) => {
                if (!isRoutePath('/PlaylistDetail')) return;

                const scroller = getRecycleScrollerByKeyField('trackKey');
                const overlay = scroller && detailOverlays.get(scroller);
                if (overlay?.locals.length && event.target?.closest?.('.batch-action-btn, .batch-actions-menu')) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    showMessage('包含本地歌曲时暂不支持批量操作', 'error');
                    return;
                }

                const li = event.target?.closest?.('.batch-actions-menu li');
                if (!li || !li.querySelector('.fa-trash-alt')) return;

                const ul = li.parentElement;
                const addOtherLi = ul?.querySelector('li .fa-folder-plus')?.closest('li');
                if (!addOtherLi) return;

                isPeekingSelectedSongs = true;
                peekedSelectedSongs = null;
                try {
                    addOtherLi.click();
                } finally {
                    isPeekingSelectedSongs = false;
                }

                const selectedSongs = Array.isArray(peekedSelectedSongs) ? peekedSelectedSongs : [];
                peekedSelectedSongs = null;

                const localSongs = selectedSongs.filter((s) => isLocalSong(s));
                const onlineSongs = selectedSongs.filter((s) => !isLocalSong(s));

                if (localSongs.length === 0) {
                    return;
                }

                event.stopImmediatePropagation();
                event.preventDefault();

                (async () => {
                    const confirmed = window.$modal?.confirm
                        ? await window.$modal.confirm('确定要移除选中的歌曲吗？')
                        : window.confirm('确定要移除选中的歌曲吗？');

                    if (!confirmed) return;

                    const route = getCurrentRoute();
                    const gid = normalizeId(route?.query?.global_collection_id);
                    const coverEl = document.querySelector('.cover-art[data-playlist-id]');
                    const listid = normalizeId(route?.query?.listid || coverEl?.getAttribute('data-playlist-id'));

                    const localHashes = localSongs.map((s) => s.hash);
                    await removeLocalSongsFromPlaylist(listid, gid, localHashes);

                    if (onlineSongs.length > 0 && listid) {
                        const fileids = onlineSongs
                            .map((s) => s.originalData?.fileid)
                            .filter(Boolean)
                            .join(',');
                        if (fileids) {
                            await requestKugouApi('/playlist/tracks/del', {
                                listid,
                                fileids
                            }).catch(() => {});
                        }
                    }

                    const removeHashSet = new Set(selectedSongs.map((s) => s.hash));
                    const scroller = getRecycleScrollerByKeyField('trackKey');
                    const items = scroller?.props?.items;
                    if (Array.isArray(items)) {
                        for (let i = items.length - 1; i >= 0; i--) {
                            if (removeHashSet.has(items[i].hash)) {
                                items.splice(i, 1);
                            }
                        }
                        scroller.proxy?.updateVisibleItems?.(true);
                    }

                    const batchBtn = document.querySelector('.detail-page .batch-action-btn.active');
                    batchBtn?.click();

                    showMessage('歌曲已从歌单中移除', 'success');
                })();
            }, true);
        }

        // ==================== LocalMusic.vue 右键菜单、顶部按钮与批量加入歌单 ====================

        let customContextMenuEl = null;

        function closeCustomContextMenu() {
            if (customContextMenuEl) {
                customContextMenuEl.remove();
                customContextMenuEl = null;
            }
        }

        async function resolveLocalMusicTrackFromRow(rowEl) {
            const titleEl = rowEl.querySelector('.track-title');
            const titleAttr = titleEl?.getAttribute('title')?.trim() || '';
            const artistAttr = rowEl.querySelector('.track-artist')?.getAttribute('title')?.trim() ||
                rowEl.querySelector('.track-artist')?.textContent?.trim() || '';

            const scroller = getRecycleScrollerByKeyField('cacheKey');
            const items = scroller?.props?.items;
            if (Array.isArray(items) && items.length > 0) {
                if (titleAttr) {
                    const byTitleAttr = items.find((it) =>
                        (it.name === titleAttr || it.displayName === titleAttr) &&
                        (!artistAttr || it.author === artistAttr)
                    );
                    if (byTitleAttr) return byTitleAttr;
                }
                const indexText = rowEl.querySelector('.track-number')?.textContent?.trim();
                const rowIndex = indexText && /^\d+$/.test(indexText) ? Number(indexText) - 1 : -1;
                if (rowIndex >= 0 && rowIndex < items.length) {
                    return items[rowIndex];
                }
            }

            if (titleAttr) {
                const fromDb = await getTrackFromHostDB(null, titleAttr);
                if (fromDb) return fromDb;
            }
            return null;
        }

        async function getAllCurrentLocalMusicTracks() {
            const scroller = getRecycleScrollerByKeyField('cacheKey');
            const items = scroller?.props?.items;
            if (Array.isArray(items) && items.length > 0) {
                return items;
            }
            return await getAllTracksFromHostDB();
        }

        async function handleBatchAddLocalToLike(songs) {
            let likeId = localStorage.getItem('like');
            if (!likeId) {
                await fetchUserPlaylists(true);
                likeId = localStorage.getItem('like');
            }
            if (!likeId) {
                showMessage('请先登录后再添加到「我喜欢」', 'error');
                return;
            }
            const { added, skipped } = await addLocalSongsToPlaylist(likeId, songs, {
                listid: likeId,
                name: '我喜欢'
            });
            if (added > 0) {
                showMessage(songs.length > 1 ? `已将 ${added} 首本地歌曲添加到「我喜欢」` : '成功添加到「我喜欢」', 'success');
            } else if (skipped > 0) {
                showMessage('本地歌曲已在「我喜欢」中', 'info');
            }
        }

        async function openCustomPlaylistPickerModal(songs) {
            const playlists = await fetchUserPlaylists(true);
            if (!playlists || playlists.length === 0) {
                showMessage('请先登录并确保已有歌单', 'error');
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'mk-local-playlist-modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'mk-local-playlist-modal';

            const title = document.createElement('h3');
            title.textContent = `收藏到歌单（共 ${songs.length} 首本地歌曲）`;
            modal.appendChild(title);

            const ul = document.createElement('ul');
            for (const p of playlists) {
                const li = document.createElement('li');
                li.textContent = p.name;
                li.addEventListener('click', async () => {
                    overlay.remove();
                    const { added, skipped } = await addLocalSongsToPlaylist(p.listid, songs, p);
                    if (added > 0) {
                        showMessage(
                            songs.length > 1
                                ? `已将 ${added} 首本地歌曲添加到「${p.name}」`
                                : `成功添加到「${p.name}」`,
                            'success'
                        );
                    } else if (skipped > 0) {
                        showMessage('本地歌曲已在该歌单中', 'info');
                    }
                });
                ul.appendChild(li);
            }
            modal.appendChild(ul);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'mk-close-btn';
            closeBtn.textContent = '关闭';
            closeBtn.addEventListener('click', () => overlay.remove());
            modal.appendChild(closeBtn);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }

        function openLocalMusicContextMenu(event, track) {
            closeCustomContextMenu();

            const menu = document.createElement('div');
            menu.className = 'mk-local-context-menu';

            const ul = document.createElement('ul');

            const likeLi = document.createElement('li');
            likeLi.innerHTML = `<i class="fa-solid fa-heart"></i> <span>添加到我喜欢</span>`;
            likeLi.addEventListener('click', async (e) => {
                e.stopPropagation();
                closeCustomContextMenu();
                await handleBatchAddLocalToLike([track]);
            });
            ul.appendChild(likeLi);

            const addPlaylistLi = document.createElement('li');
            addPlaylistLi.innerHTML = `<i class="fa-solid fa-plus"></i> <span>添加到歌单</span> <span class="mk-submenu-arrow">▸</span>`;
            let submenuEl = null;

            addPlaylistLi.addEventListener('mouseenter', async () => {
                if (submenuEl) return;
                submenuEl = document.createElement('ul');
                submenuEl.className = 'mk-submenu';
                const loadingLi = document.createElement('li');
                loadingLi.textContent = '加载中...';
                submenuEl.appendChild(loadingLi);
                addPlaylistLi.appendChild(submenuEl);

                const playlists = await fetchUserPlaylists();
                if (!submenuEl) return;
                submenuEl.innerHTML = '';

                if (!playlists || playlists.length === 0) {
                    const emptyLi = document.createElement('li');
                    emptyLi.textContent = '暂无可用歌单';
                    submenuEl.appendChild(emptyLi);
                    return;
                }

                for (const p of playlists) {
                    const itemLi = document.createElement('li');
                    itemLi.textContent = p.name;
                    itemLi.title = p.name;
                    itemLi.addEventListener('click', async (ev) => {
                        ev.stopPropagation();
                        closeCustomContextMenu();
                        const { added } = await addLocalSongsToPlaylist(p.listid, [track], p);
                        if (added > 0) {
                            showMessage(`成功添加到「${p.name}」`, 'success');
                        }
                    });
                    submenuEl.appendChild(itemLi);
                }
            });

            addPlaylistLi.addEventListener('mouseleave', () => {
                if (submenuEl) {
                    submenuEl.remove();
                    submenuEl = null;
                }
            });
            ul.appendChild(addPlaylistLi);

            const nextLi = document.createElement('li');
            nextLi.innerHTML = `<i class="fa-solid fa-arrow-right"></i> <span>添加到下一首</span>`;
            nextLi.addEventListener('click', async (e) => {
                e.stopPropagation();
                closeCustomContextMenu();
                const pc = getPlayerControlInstance();
                const hash = getSongHash(track);
                if (pc?.exposed?.addToNext && hash) {
                    const coverUrl = getCoverUrl(hash, track.coverBlob, track.cover);
                    await pc.exposed.addToNext(
                        hash,
                        track.displayName || track.name || '未知歌曲',
                        coverUrl,
                        track.author || '未知艺术家',
                        track.timelen || track.duration || track.timeLength || 0
                    );
                    showMessage('添加成功', 'success');
                }
            });
            ul.appendChild(nextLi);

            menu.appendChild(ul);
            document.body.appendChild(menu);
            customContextMenuEl = menu;

            const rect = menu.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let x = event.clientX;
            let y = event.clientY;
            if (x + rect.width > vw - 8) x = Math.max(8, vw - rect.width - 8);
            if (y + rect.height > vh - 8) y = Math.max(8, vh - rect.height - 8);
            if (x + rect.width + 180 > vw - 8) {
                menu.classList.add('submenu-left');
            }
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
        }

        function installLocalMusicPageListeners() {
            document.addEventListener('contextmenu', (event) => {
                if (!isRoutePath('/LocalMusic')) return;

                const rowEl = event.target?.closest?.('.detail-page .track-list .li');
                if (!rowEl) return;

                event.preventDefault();
                event.stopPropagation();
                const clientX = event.clientX;
                const clientY = event.clientY;

                resolveLocalMusicTrackFromRow(rowEl).then((track) => {
                    if (track) {
                        openLocalMusicContextMenu({ clientX, clientY }, track);
                    }
                });
            }, true);

            document.addEventListener('click', () => {
                closeCustomContextMenu();
            });
            document.addEventListener('scroll', () => {
                closeCustomContextMenu();
            }, true);
        }

        function enhanceLocalMusicPageUI() {
            if (!isRoutePath('/LocalMusic')) return;

            // 1. 在「本地音乐」顶部操作区注入“全部添加到歌单”按钮
            const actionsContainer = document.querySelector('.detail-page .header .actions');
            const playAllBtn = actionsContainer?.querySelector('.primary-btn');
            if (actionsContainer && playAllBtn && !actionsContainer.querySelector('[data-mk-add-all-btn]')) {
                const addAllBtn = document.createElement('button');
                addAllBtn.className = 'upload-btn';
                addAllBtn.setAttribute('data-mk-add-all-btn', 'true');
                addAllBtn.innerHTML = `<i class="fas fa-folder-plus"></i> 全部添加到歌单`;
                addAllBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const items = await getAllCurrentLocalMusicTracks();
                    if (!Array.isArray(items) || items.length === 0) {
                        showMessage('当前没有可添加的本地音乐', 'info');
                        return;
                    }
                    await openCustomPlaylistPickerModal(items);
                });
                playAllBtn.insertAdjacentElement('afterend', addAllBtn);
            }

            // 2. 在「本地音乐」批量操作菜单注入“添加到我喜欢”和“添加到其他歌单”
            const batchMenuUl = document.querySelector('.detail-page .batch-actions-menu ul');
            if (!batchMenuUl || batchMenuUl.querySelector('[data-mk-local-batch]')) return;

            const nativeQueueLi = batchMenuUl.querySelector('li');
            if (!nativeQueueLi) return;

            const collectSelectedFromDOM = async () => {
                const selectedRows = Array.from(document.querySelectorAll('.detail-page .track-list .li.selected'));
                const tracks = [];
                for (const row of selectedRows) {
                    const t = await resolveLocalMusicTrackFromRow(row);
                    if (t) tracks.push(t);
                }
                return tracks;
            };

            const likeLi = document.createElement('li');
            likeLi.setAttribute('data-mk-local-batch', 'like');
            likeLi.innerHTML = `<i class="fas fa-heart"></i> 添加到我喜欢`;
            likeLi.addEventListener('click', async (e) => {
                e.stopPropagation();
                const domSelected = await collectSelectedFromDOM();
                const pc = getPlayerControlInstance();
                if (pc?.exposed?.__mkLocalPlaylistHooked) {
                    interceptNextLocalBatchAction = 'like';
                    nativeQueueLi.click();
                } else if (domSelected.length > 0) {
                    await handleBatchAddLocalToLike(domSelected);
                    document.querySelector('.detail-page .batch-action-btn.active')?.click();
                }
            });

            const playlistLi = document.createElement('li');
            playlistLi.setAttribute('data-mk-local-batch', 'playlist');
            playlistLi.innerHTML = `<i class="fas fa-folder-plus"></i> 添加到其他歌单`;
            playlistLi.addEventListener('click', async (e) => {
                e.stopPropagation();
                const domSelected = await collectSelectedFromDOM();
                const pc = getPlayerControlInstance();
                if (pc?.exposed?.__mkLocalPlaylistHooked) {
                    interceptNextLocalBatchAction = 'playlist';
                    nativeQueueLi.click();
                } else if (domSelected.length > 0) {
                    await openCustomPlaylistPickerModal(domSelected);
                    document.querySelector('.detail-page .batch-action-btn.active')?.click();
                }
            });

            batchMenuUl.appendChild(likeLi);
            batchMenuUl.appendChild(playlistLi);
        }

        // ==================== 全局主循环与观察器初始化 ====================

        async function bootstrap() {
            ensurePluginStyles();
            installFileSystemPermissionHook();
            await loadPlaylistMetaCacheFromDB();
            installPlaylistSelectModalClickInterceptor();
            installContextMenuClickInterceptor();
            installBatchRemoveInterceptor();
            installLocalMusicPageListeners();

            document.addEventListener('input', (e) => {
                if (e.target?.classList?.contains('search-input')) {
                    schedulePlaylistDetailSync(false);
                }
            }, true);

            const tick = () => {
                try {
                    hookPlayerControl();
                    hookPlaylistSelectModals();
                    hookContextMenus();
                    harvestPlaylistLinksFromDOM();
                    enhanceLocalMusicPageUI();

                    if (isRoutePath('/PlaylistDetail')) {
                        schedulePlaylistDetailSync(false);
                    } else if (isRoutePath('/library')) {
                        scheduleLibraryCountSync();
                    }
                } catch (_) {
                    // ignore transient errors
                }
            };

            setInterval(tick, 400);

            const observer = new MutationObserver(() => {
                enhanceLocalMusicPageUI();
                if (isRoutePath('/PlaylistDetail')) {
                    schedulePlaylistDetailSync(false);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            tick();
            console.log(PLUGIN_TAG, '本地音乐歌单管理插件已在页面环境激活');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
    }

    // The manifest runs this script in the page's MAIN world, where Vue's
    // component instances and player controls are accessible.
    mainWorldPlugin();
})();
