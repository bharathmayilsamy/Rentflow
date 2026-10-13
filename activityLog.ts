export interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  undoData?: any;
}

const STORAGE_KEY = 'v-do_activity_log';
const MAX_ENTRIES = 100;

export const getActivityLog = (): ActivityEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const logActivity = (action: string, detail: string, undoData?: any) => {
  const log = getActivityLog();
  log.unshift({
    id: Date.now().toString(),
    action,
    detail,
    timestamp: new Date().toISOString(),
    undoData,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, MAX_ENTRIES)));
};

export const clearActivityLog = () => {
  localStorage.removeItem(STORAGE_KEY);
};
