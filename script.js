// Konfigurasi Supabase dari Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL dan Key harus diatur di environment variables');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let html5QrCode;
let scanning = false;

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async function() {
    loadActivities();
    
    document.getElementById('visitorForm').addEventListener('submit', saveVisitorData);
    document.getElementById('startScan').addEventListener('click', toggleScanner);
});

// Toggle scanner QR
function toggleScanner() {
    const button = document.getElementById('startScan');
    
    if (!scanning) {
        startScanner();
        button.textContent = 'Hentikan Pemindaian';
    } else {
        stopScanner();
        button.textContent = 'Mulai Pemindaian';
    }
}

// Mulai scanner QR
function startScanner() {
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        scanning = true;
    }).catch(err => {
        console.error("Gagal memulai kamera:", err);
        alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    });
}

// Hentikan scanner QR
function stopScanner() {
    if (html5QrCode && scanning) {
        html5QrCode.stop().then(() => {
            scanning = false;
        }).catch(err => {
            console.error("Gagal menghentikan scanner:", err);
        });
    }
}

// Sukses scan QR
function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('scanResult').innerHTML = `
        <div style="background: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 5px; margin: 10px 0;">
            <strong>Kode QR Terdeteksi:</strong> ${decodedText}
        </div>
    `;
    document.getElementById('bookQR').value = decodedText;
    stopScanner();
    document.getElementById('startScan').textContent = 'Mulai Pemindaian';
    scanning = false;
}

// Gagal scan QR
function onScanFailure(error) {
    // Handle scan failure silently
}

// Simpan data pengunjung
async function saveVisitorData(e) {
    e.preventDefault();
    
    const visitorData = {
        name: document.getElementById('visitorName').value,
        class: document.getElementById('visitorClass').value
    };
    
    const activityData = {
        activity_type: document.getElementById('activityType').value,
        status: document.getElementById('bookStatus').value,
        book_title: document.getElementById('bookTitle').value,
        book_qr: document.getElementById('bookQR').value
    };
    
    try {
        // Simpan data pengunjung
        const { data: visitor, error: visitorError } = await supabase
            .from('visitors')
            .insert([visitorData])
            .select();
        
        if (visitorError) throw visitorError;
        
        // Simpan atau update data buku
        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                qr_code: activityData.book_qr,
                title: activityData.book_title,
                status: activityData.status === 'dipinjam' ? 'borrowed' : 
                       activityData.status === 'dibaca' ? 'reading' : 'available'
            })
            .select();
        
        if (bookError) throw bookError;
        
        // Simpan aktivitas
        const { error: activityError } = await supabase
            .from('activities')
            .insert([{
                visitor_id: visitor[0].id,
                book_id: book[0].id,
                activity_type: activityData.activity_type,
                status: activityData.status
            }]);
        
        if (activityError) throw activityError;
        
        alert('Data berhasil disimpan!');
        document.getElementById('visitorForm').reset();
        loadActivities();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan data: ' + error.message);
    }
}

// Load aktivitas terbaru
async function loadActivities() {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select(`
                *,
                visitors(name, class),
                books(title, qr_code)
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';
        
        data.forEach(activity => {
            const activityDiv = document.createElement('div');
            activityDiv.className = 'activity-item';
            activityDiv.innerHTML = `
                <h3>${activity.visitors?.name || 'Pengunjung'} - ${activity.visitors?.class || ''}</h3>
                <p><strong>Buku:</strong> ${activity.books?.title || 'Tidak diketahui'}</p>
                <p><strong>Aktivitas:</strong> ${formatActivity(activity.activity_type)} (${formatStatus(activity.status)})</p>
                <p><strong>Waktu:</strong> ${new Date(activity.created_at).toLocaleString('id-ID')}</p>
            `;
            activityList.appendChild(activityDiv);
        });
        
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// Format tampilan aktivitas
function formatActivity(activity) {
    const activities = {
        'reading': 'Membaca',
        'borrowing': 'Meminjam',
        'returning': 'Mengembalikan'
    };
    return activities[activity] || activity;
}

// Format tampilan status
function formatStatus(status) {
    const statuses = {
        'dibaca': 'Dibaca',
        'dipinjam': 'Dipinjam',
        'dikembalikan': 'Dikembalikan'
    };
    return statuses[status] || status;
}

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', () => {
    if (html5QrCode && scanning) {
        html5QrCode.stop();
    }
});
