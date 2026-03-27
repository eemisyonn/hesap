// RAPOR2 - Rapor Şablonu Editörü JavaScript

// Sayfa yüklendiğinde verileri yükle
document.addEventListener('DOMContentLoaded', function() {
    rapor2LoadData();
    
    // Ctrl+S ile kaydetme
    document.getElementById('rapor2Editor').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            rapor2SaveData();
        }
    });
});

// Verileri sunucudan yükle
function rapor2LoadData() {
    fetch('/get_rapor2_data')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Veri yükleme hatası:', data.error);
                return;
            }

            const editor = document.getElementById('rapor2Editor');
            if (!editor) {
                console.warn('rapor2Editor elementi bulunamadı.');
                return;
            }

            editor.value = data.content || '';
            rapor2AutoFillPlaceholders(editor);
        })
        .catch(error => {
            console.error('Veri yükleme hatası:', error);
        });
}

// Verileri sunucuya kaydet
function rapor2SaveData() {
    const content = document.getElementById('rapor2Editor').value;
    
    fetch('/save_rapor2_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Bootstrap toast ile başarı mesajı göster
            showToast('Başarılı!', 'Rapor şablonu başarıyla kaydedildi.', 'success');
        } else {
            showToast('Hata!', 'Kaydetme sırasında hata oluştu: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Kaydetme hatası:', error);
        showToast('Hata!', 'Kaydetme sırasında hata oluştu.', 'danger');
    });
}

// Editörü temizle
function rapor2ClearData() {
    if (confirm('Tüm içeriği silmek istediğinizden emin misiniz?')) {
        document.getElementById('rapor2Editor').value = '';
        showToast('Bilgi', 'İçerik temizlendi. Kaydetmeyi unutmayın!', 'warning');
    }
}

// ==================== ŞABLON OTO DOLDURMA ====================

function rapor2AutoFillPlaceholders(editorEl) {
    const editor = editorEl || document.getElementById('rapor2Editor');
    if (!editor) return;

    const asama1Data = getSessionJson('asama1Data');
    const asama2Data = getSessionJson('asama2Data');
    const asama3Data = getSessionJson('asama3Data');

    if (!asama3Data || !Array.isArray(asama3Data.parametreler) || asama3Data.parametreler.length === 0) {
        console.warn('[RAPOR2] Aşama 3 verisi bulunamadı, otomatik doldurma yapılmadı.');
        return;
    }

    const traversSayisi = getTraversCount(asama2Data);
    const measurementStats = [1, 2, 3].map(measureNo =>
        computeMeasurementStats(asama3Data, measureNo, traversSayisi, asama1Data)
    ).filter(Boolean);

    if (measurementStats.length === 0) {
        console.warn('[RAPOR2] Ölçüm istatistikleri üretilemedi, otomatik doldurma atlandı.');
        return;
    }

    let content = editor.value || '';

    // Cihaz Seri
    const cihazSeriValues = measurementStats
        .map(stat => stat.cihazSeri)
        .filter(Boolean);
    if (cihazSeriValues.length === 0 && asama1Data?.cihazSeri) {
        cihazSeriValues.push(asama1Data.cihazSeri);
    }
    if (cihazSeriValues.length) {
        content = replaceFieldOccurrences(content, 'Cihaz Seri', cihazSeriValues);
    }

    // Başlangıç (her ölçümün ilk travers zamanı)
    const baslangicValues = measurementStats
        .map(stat => stat.baslangic)
        .filter(Boolean);
    if (baslangicValues.length) {
        content = replaceFieldOccurrences(content, 'Baslangic', baslangicValues);
    }

    // Ayarlanan Süre (2. aşama verisi - dk formatında)
    const ayarlananSureValue = formatAyarlananSure(asama2Data);
    if (ayarlananSureValue) {
        content = replaceFieldOccurrences(content, 'Ayarlanan Sure', [ayarlananSureValue]);
    }

    // Baca No (1. aşama verisinden)
    const bacaNoValues = measurementStats
        .map(stat => stat.bacaNo)
        .filter(Boolean);
    if (bacaNoValues.length) {
        content = replaceFieldOccurrences(content, 'Baca No', bacaNoValues);
    }

    // Nem (1. aşama verisinden)
    const nemValues = measurementStats
        .map(stat => stat.nem)
        .filter(Boolean);
    if (nemValues.length) {
        content = replaceFieldOccurrences(content, 'Nem', nemValues);
    }

    // Ort. baca hızı (her ölçüm için ortalama, m/s)
    const ortBacaValues = measurementStats
        .map(stat => stat.ortBacaHizi != null ? `${stat.ortBacaHizi} m/s` : null)
        .filter(Boolean);
    if (ortBacaValues.length) {
        content = replaceFieldOccurrences(content, 'Ort.baca hizi', ortBacaValues);
    }

    // Sayaç hacmi (her ölçüm için toplam l)
    const sayacHacimValues = measurementStats
        .map(stat => stat.sayacHacmi != null ? `${stat.sayacHacmi} l` : null)
        .filter(Boolean);
    if (sayacHacimValues.length) {
        content = replaceFieldOccurrences(content, 'Sayac hacmi', sayacHacimValues);
    }

    editor.value = content;
}

function getSessionJson(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`[RAPOR2] sessionStorage "${key}" okunamadı:`, error);
        return null;
    }
}

function getTraversCount(asama2Data) {
    if (!asama2Data || !Array.isArray(asama2Data.parametreler) || asama2Data.parametreler.length === 0) {
        return 6;
    }
    const value = asama2Data.parametreler[0]?.traversSayisi;
    const travers = parseInt(value, 10);
    return Number.isFinite(travers) && travers > 0 ? travers : 6;
}

function formatDecimal(value, fractionDigits = 1) {
    if (value == null || value === '') {
        return null;
    }

    const numericValue = typeof value === 'number'
        ? value
        : parseFloat(String(value).replace(',', '.'));

    if (!Number.isFinite(numericValue)) {
        return null;
    }

    return numericValue.toFixed(fractionDigits).replace('.', ',');
}

function formatBaslangicValue(rawValue) {
    if (!rawValue) {
        // Varsayılan olarak bugünün tarihini formatla (gg/aa/yy ss:dd)
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2); // Son 2 haneyi al (yy)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    const trimmed = String(rawValue).trim();
    if (!trimmed) {
        // Boş string ise bugünün tarihini döndür (gg/aa/yy ss:dd)
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2); // Son 2 haneyi al (yy)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Eğer zaten slash formatındaysa, yıl formatını kontrol et ve düzelt
    if (trimmed.includes('/') && trimmed.includes(':')) {
        // Yıl 4 haneli ise 2 haneye düşür
        const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2})/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const yearFull = match[3];
            const year = yearFull.length === 4 ? yearFull.slice(-2) : yearFull; // 4 haneli ise son 2 haneyi al
            const hours = match[4].padStart(2, '0');
            const minutes = match[5].padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return trimmed;
    }

    if (trimmed.includes('T')) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2); // Son 2 haneyi al (yy)
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    }

    const match = trimmed.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\s+(\d{1,2}):(\d{1,2})/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const yearFull = match[3];
        const year = yearFull.length === 4 ? yearFull.slice(-2) : yearFull; // 4 haneli ise son 2 haneyi al
        const hours = match[4].padStart(2, '0');
        const minutes = match[5].padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Eğer hiçbir format eşleşmezse ve nokta içeriyorsa, noktayı slash ile değiştir
    if (trimmed.includes('.')) {
        return trimmed.replace(/\./g, '/');
    }

    return trimmed;
}

function computeMeasurementStats(asama3Data, measurementNo, traversPerMeasurement, asama1Data) {
    const firstParametre = asama3Data?.parametreler?.[0];
    if (!firstParametre || !Array.isArray(firstParametre.hesaplamalar)) {
        return null;
    }

    const rows = firstParametre.hesaplamalar;
    const startIndex = (measurementNo - 1) * traversPerMeasurement;
    const measurementRows = rows.slice(startIndex, startIndex + traversPerMeasurement);

    if (measurementRows.length === 0) {
        return null;
    }

    const numberFrom = value => {
        if (value == null) return null;
        const normalized = String(value).replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const baslangic = formatBaslangicValue(measurementRows[0]?.degerler?.deger_2 || '');
    const cihazSeriRaw = (measurementRows[0]?.degerler?.deger_19 || asama1Data?.cihazSeri || '').trim();
    const cihazSeri = cihazSeriRaw || '';
    
    // Baca No bilgisini 1. aşama verilerinden al
    const bacaNoRaw = (asama1Data?.bacaNo || asama1Data?.baca || '').trim();
    const bacaNo = bacaNoRaw || '';
    
    // Nem bilgisini 1. aşama verilerinden al
    const nemRaw = (asama1Data?.nem || '').trim();
    const nem = nemRaw || '';

    const ortBacaValues = measurementRows
        .map(row => numberFrom(row?.degerler?.deger_7))
        .filter(value => value != null);
    const ortBacaHizi = ortBacaValues.length
        ? formatDecimal(ortBacaValues.reduce((sum, val) => sum + val, 0) / ortBacaValues.length, 1)
        : null;

    const sayacHacimValues = measurementRows
        .map(row => numberFrom(row?.degerler?.deger_12))
        .filter(value => value != null);
    const sayacHacmi = sayacHacimValues.length
        ? formatDecimal(sayacHacimValues.reduce((sum, val) => sum + val, 0), 1)
        : null;

    return {
        baslangic: baslangic || '',
        cihazSeri: cihazSeri || '',
        bacaNo: bacaNo || '',
        nem: nem || '',
        ortBacaHizi: ortBacaHizi != null ? ortBacaHizi : null,
        sayacHacmi: sayacHacmi != null ? sayacHacmi : null
    };
}

function formatAyarlananSure(asama2Data) {
    if (!asama2Data || !Array.isArray(asama2Data.parametreler) || asama2Data.parametreler.length === 0) {
        return '';
    }

    const parametre = asama2Data.parametreler[0] || {};
    const rawValue = parametre.ayarlananSure ?? parametre.sure;

    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return '';
    }

    // Eğer zaten "dk" formatındaysa veya sayısal dakika değeri ise
    if (typeof rawValue === 'number') {
        return `${rawValue} dk`;
    }
    
    if (typeof rawValue === 'string') {
        // Eğer "dk" içeriyorsa olduğu gibi döndür
        if (rawValue.includes('dk')) {
            return rawValue.trim();
        }
        
        // Eğer ":" içeriyorsa (SS:DD formatı) dakikaya çevir
        if (rawValue.includes(':')) {
            const parts = rawValue.split(':');
            if (parts.length === 2) {
                const minutes = parseInt(parts[0]) || 0;
                const seconds = parseInt(parts[1]) || 0;
                const totalMinutes = Math.round(minutes + seconds / 60);
                return `${totalMinutes} dk`;
            }
        }
        
        // Sayısal değer ise dakika olarak ekle
        const numericValue = parseFloat(rawValue.replace(',', '.'));
        if (Number.isFinite(numericValue)) {
            return `${Math.round(numericValue)} dk`;
        }
    }

    return rawValue.toString();
}

function replaceFieldOccurrences(content, label, values) {
    if (!content || !label || !Array.isArray(values) || values.length === 0) {
        return content;
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedLabel}\\s*:\\s*)(.*)`, 'gi');
    let occurrence = 0;

    return content.replace(regex, (match, prefix, currentValue) => {
        if (occurrence >= values.length) {
            return match;
        }

        const trimmed = (currentValue || '').trim();
        if (/\d/.test(trimmed)) {
            return match;
        }

        const value = values[occurrence];
        if (!value) {
            return match;
        }

        occurrence++;
        return `${prefix}${value}`;
    });
}

// Toast mesajı göster
function showToast(title, message, type) {
    // Eğer Bootstrap toast varsa kullan
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // Toast container yoksa oluştur
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-warning';
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    document.getElementById('toastContainer').insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Toast kapandıktan sonra DOM'dan kaldır
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}
