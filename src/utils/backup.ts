export const exportBackup = (data: Record<string, any>) => {
  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'V-DO Property Management',
    data,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `v-do-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importBackup = (file: File): Promise<Record<string, any> | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.data) resolve(parsed.data);
        else resolve(null);
      } catch { resolve(null); }
    };
    reader.readAsText(file);
  });
};
