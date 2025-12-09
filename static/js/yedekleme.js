document.addEventListener('DOMContentLoaded', () => {
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const backupStatus = document.getElementById('backupStatus');
    const restoreFileInput = document.getElementById('restoreFileInput');
    const backupFileInput = document.getElementById('backupFileInput');
    const backupTableBody = document.getElementById('backupTableBody');

    const showStatus = (message, type) => {
        if (!backupStatus) {
            return;
        }

        backupStatus.innerHTML = message;
        backupStatus.className = `alert alert-${type}`;
        backupStatus.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                backupStatus.style.display = 'none';
            }, 5000);
        }
    };

    const formatBytes = (bytes) => {
        const value = typeof bytes === 'number' ? bytes : Number(bytes || 0);
        if (!value || value <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let val = value;
        let idx = 0;

        while (val >= 1024 && idx < units.length - 1) {
            val /= 1024;
            idx += 1;
        }

        return `${val.toFixed(1)} ${units[idx]}`;
    };

    const loadBackups = () => {
        if (!backupTableBody) {
            return;
        }

        fetch('/api/backups/list')
            .then((response) => response.json())
            .then((data) => {
                if (!data || !data.success) {
                    backupTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Yedek listesi alınamadı</td></tr>';
                    return;
                }

                const backups = data.backups || [];
                backupTableBody.innerHTML = '';

                if (backups.length === 0) {
                    backupTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Kayıtlı yedek bulunamadı</td></tr>';
                    return;
                }

                backups.forEach((backup, index) => {
                    const tr = document.createElement('tr');
                    const sizeLabel = formatBytes(backup.size_bytes || 0);

                    tr.innerHTML =
                        `<td class="align-middle"><input type="checkbox" class="form-check-input backup-select" data-name="${backup.name}"></td>` +
                        `<td class="align-middle">${index + 1}</td>` +
                        `<td class="align-middle">${backup.name}</td>` +
                        `<td class="align-middle">${backup.display_date || ''}</td>` +
                        `<td class="align-middle">${sizeLabel}</td>` +
                        '<td class="align-middle text-end">' +
                        `<button type="button" class="btn btn-sm btn-danger backup-delete" data-name="${backup.name}">Sil</button>` +
                        `<button type="button" class="btn btn-sm btn-warning ms-1 backup-restore" data-name="${backup.name}">Geri Yükle</button>` +
                        '</td>';

                    backupTableBody.appendChild(tr);
                });
            })
            .catch(() => {
                if (backupTableBody) {
                    backupTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Yedek listesi alınamadı</td></tr>';
                }
            });
    };

    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            showStatus('Veri yedekleme başlatılıyor...', 'info');

            fetch('/api/backups/run-now', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data && data.success) {
                        showStatus('Yedekleme tamamlandı.', 'success');
                        loadBackups();
                    } else {
                        const message = data && data.error ? data.error : 'Yedekleme sırasında hata oluştu.';
                        showStatus(message, 'danger');
                    }
                })
                .catch(() => {
                    showStatus('Yedekleme isteği gönderilirken hata oluştu.', 'danger');
                });
        });
    }

    if (restoreBtn && restoreFileInput) {
        restoreBtn.addEventListener('click', () => {
            restoreFileInput.click();
        });
    }

    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', (event) => {
            const files = Array.from(event.target.files || []);
            if (files.length === 0) {
                return;
            }

            if (confirm('⚠️ DİKKAT: Bu işlem mevcut tüm verileri siler ve seçilen yedekten geri yükler!\n\nDevam etmek istediğinizden emin misiniz?')) {
                showStatus('Veri geri yükleme başlatılıyor...', 'warning');

                const formData = new FormData();
                files.forEach((file) => formData.append('files', file));

                // Admin sistemi silindi - restore API kaldırıldı
                console.log('Admin sistemi silindi - restore API kaldırıldı');
            }

            event.target.value = '';
        });
    }

    if (backupTableBody) {
        backupTableBody.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.classList.contains('backup-delete')) {
                const name = target.getAttribute('data-name');
                if (!name) {
                    return;
                }

                if (!window.confirm(`Seçili yedeği silmek istediğinizden emin misiniz?\n\n${name}`)) {
                    return;
                }

                fetch('/api/backups/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ names: [name] }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data && data.success) {
                            showStatus('Yedek silindi.', 'success');
                            loadBackups();
                        } else {
                            const message = data && data.error ? data.error : 'Yedek silinemedi.';
                            showStatus(message, 'danger');
                        }
                    })
                    .catch(() => {
                        showStatus('Yedek silinirken hata oluştu.', 'danger');
                    });
            } else if (target.classList.contains('backup-restore')) {
                const name = target.getAttribute('data-name');
                if (!name) {
                    return;
                }

                if (!window.confirm(`DİKKAT: Bu işlem mevcut tüm verilerin üzerine yazacaktır.\n\nSeçili yedeği geri yüklemek istediğinizden emin misiniz?\n\n${name}`)) {
                    return;
                }

                fetch('/api/backups/restore', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data && data.success) {
                            showStatus('Yedek başarıyla geri yüklendi.', 'success');
                            loadBackups();
                        } else {
                            const message = data && data.error ? data.error : 'Yedek geri yüklenemedi.';
                            showStatus(message, 'danger');
                        }
                    })
                    .catch(() => {
                        showStatus('Yedek geri yüklenirken hata oluştu.', 'danger');
                    });
            }
        });
    }

    loadBackups();
});


