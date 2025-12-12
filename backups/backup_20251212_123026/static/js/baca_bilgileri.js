(function () {
    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    function refreshToBacaTab() {
        window.location.href = '/ayarlar?tab=baca-bilgileri';
    }

    function initializeCheckboxHandlers() {
        const selectAll = document.getElementById('tumunuSecBaca');
        const bulkDeleteButton = document.getElementById('secilenleriSilBaca');

        const updateBulkDeleteState = () => {
            const checkedCount = document.querySelectorAll('.baca-para-checkbox:checked').length;
            if (bulkDeleteButton) {
                bulkDeleteButton.disabled = checkedCount === 0;
            }
            if (selectAll) {
                const allCheckboxes = document.querySelectorAll('.baca-para-checkbox:not(:disabled)');
                selectAll.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
            }
        };

        if (selectAll) {
            selectAll.addEventListener('change', () => {
                document.querySelectorAll('.baca-para-checkbox:not(:disabled)').forEach(cb => {
                    cb.checked = selectAll.checked;
                });
                updateBulkDeleteState();
            });
        }

        document.querySelectorAll('.baca-para-checkbox').forEach(cb => {
            cb.addEventListener('change', updateBulkDeleteState);
        });

        if (bulkDeleteButton) {
            bulkDeleteButton.addEventListener('click', () => {
                const ids = [];
                document.querySelectorAll('.baca-para-checkbox:checked').forEach(cb => ids.push(cb.value));
                if (!ids.length) {
                    return;
                }
                if (!confirm(`Seçilen ${ids.length} baca parametresini silmek istediğinizden emin misiniz?`)) {
                    return;
                }

                fetch('/delete_selected_baca_para', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids })
                })
                .then(res => res.json())
                .then(data => {
                    if (data?.success) {
                        refreshToBacaTab();
                    } else {
                        alert('Hata: ' + (data?.error || 'Bilinmeyen hata'));
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Silme işlemi sırasında bir hata oluştu.');
                });
            });
        }

        updateBulkDeleteState();
    }

    function initializeEditButtons() {
        const editModalEl = document.getElementById('bacaParaEditModal');
        const editForm = document.getElementById('bacaParaEditForm');
        const modal = (window.bootstrap && editModalEl) ? new bootstrap.Modal(editModalEl) : null;

        document.querySelectorAll('.edit-baca-para-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!editForm) return;
                editForm.reset();
                editForm.action = '/edit_baca_para/' + btn.getAttribute('data-id');
                const adi = btn.getAttribute('data-baca-par-adi') || '';
                const icerik = btn.getAttribute('data-liste-icerigi') || '';
                editForm.querySelector('#edit_para_id').value = btn.getAttribute('data-id') || '';
                editForm.querySelector('#edit_baca_par_adi').value = adi;
                editForm.querySelector('#edit_liste_icerigi').value = icerik;
                if (modal) {
                    modal.show();
                }
            });
        });
    }

    function initializeAddModal() {
        const addButton = document.querySelector('[data-bs-target="#bacaParaEkleModal"]');
        const addForm = document.getElementById('bacaParaForm');
        if (addButton && addForm) {
            addButton.addEventListener('click', () => {
                addForm.reset();
            });
        }
    }

    function initializeDeleteButtons() {
        document.querySelectorAll('.delete-baca-para-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-baca-par-adi') || '';
                if (!id) return;

                if (!confirm(`"${name}" parametresini silmek istediğinizden emin misiniz?`)) {
                    return;
                }

                fetch('/delete_baca_para/' + id, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(res => res.json())
                .then(data => {
                    if (data?.success) {
                        refreshToBacaTab();
                    } else {
                        alert('Hata: ' + (data?.error || 'Bilinmeyen hata'));
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Silme sırasında bir hata oluştu.');
                });
            });
        });
    }

    onReady(() => {
        const bacaTab = document.getElementById('baca-bilgileri');
        if (!bacaTab) return;

        initializeCheckboxHandlers();
        initializeEditButtons();
        initializeAddModal();
        initializeDeleteButtons();
    });
})();


