// Debug: Cek apakah environment variables terbaca
setTimeout(() => {
    console.log('=== DEBUG ENVIRONMENT VARIABLES ===');
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('VITE_SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_KEY ? '✓ Ada' : '✗ Tidak ada');
    console.log('====================================');
}, 2000);
// Variabel Global
let html5QrCode;
let scanning = false;
let supabaseUrl, supabaseKey;

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Dapatkan environment variables dari Netlify
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? '✓ Tersedia' : '✗ Tidak ditemukan');
    console.log('Supabase Key:', supabaseKey ? '✓ Tersedia' : '✗ Tidak ditemukan');
    
    loadVisitorData();
});

// Navigation Function
function showSection(section) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    if (section === 'scanner') {
        document.getElementById('scanner-section').classList.add('active');
    } else if (section === 'visitor') {
        document.getElementById('visitor-section').classList.add('active');
        loadVisitorData();
    }
}

// Scanner Function
function initScanner() {
    if (scanning) {
        stopScanner();
        return;
    }
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start({ facingMode: "environment" }, config, 
        (decodedText) => {
            document.getElementById('qr-result').innerHTML = `✅ Buku: ${decodedText}`;
            document.getElementById('qr_buku').value = decodedText;
            stopScanner();
        },
        (errorMessage) => {
            // Error handling
        }
    ).then(() => {
        scanning = true;
        document.querySelector('button[onclick="initScanner()"]').textContent = "Stop Scan";
    }).catch(err => {
        alert("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        console.error("Scanner error:", err);
    });
}

function stopScanner() {
    if (html5QrCode && scanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            scanning = false;
            document.querySelector('button[onclick="initScanner()"]').textContent = "Mulai Scan";
        }).catch(console.error);
    }
}

// Visitor Form Handling
document.getElementById('visitorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const visitorData = {
        nama: document.getElementById('nama').value,
        kelas: document.getElementById('kelas').value,
        aktivitas: document.getElementById('aktivitas').value,
        judul_buku: document.getElementById('judul_buku').value,
        status: document.getElementById('status').value,
        qr_buku: document.getElementById('qr_buku').value
    };
    
    try {
        // Simpan ke Supabase jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            const response = await fetch(`${supabaseUrl}/rest/v1/pengunjung`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(visitorData)
            });
            
            if (response.ok) {
                alert('Data berhasil disimpan ke database!');
            } else {
                throw new Error('Gagal menyimpan ke database');
            }
        } else {
            console.log('Supabase credentials tidak ditemukan, simpan ke localStorage');
        }
        
        // Simpan ke localStorage sebagai backup
        saveToLocal(visitorData);
        
        // Reset form
        this.reset();
        loadVisitorData();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan data. Data akan disimpan lokal.');
        saveToLocal(visitorData);
        loadVisitorData();
    }
});

// Simpan ke localStorage
function saveToLocal(data) {
    let visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
    visitors.unshift({...data, created_at: new Date().toISOString()});
    localStorage.setItem('visitors', JSON.stringify(visitors));
}

// Muat data dari Supabase atau localStorage
async function loadVisitorData() {
    const visitorDataDiv = document.getElementById('visitorData');
    visitorDataDiv.innerHTML = '<p style="text-align:center;">Memuat data...</p>';
    
    try {
        // Coba load dari Supabase dulu jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            const response = await fetch(`${supabaseUrl}/rest/v1/pengunjung?order=created_at.desc&limit=20`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayVisitors(data);
                return;
            } else {
                throw new Error('Gagal mengambil data dari Supabase');
            }
        }
        
        // Jika tidak ada credentials atau gagal, load dari localStorage
        console.log('Menggunakan data lokal');
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        displayVisitors(localData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback ke localStorage
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        displayVisitors(localData);
    }
}

// Tampilkan data pengunjung
function displayVisitors(data) {
    const visitorDataDiv = document.getElementById('visitorData');
    
    if (!data || data.length === 0) {
        visitorDataDiv.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.7);">Belum ada data pengunjung</p>';
        return;
    }
    
    let html = '';
    data.slice(0, 15).forEach(visitor => {
        const waktu = visitor.created_at ? 
            new Date(visitor.created_at).toLocaleString('id-ID') : 
            'Baru saja';
            
        html += `
            <div class="visitor-item">
                <h3>${visitor.nama || 'Tidak ada nama'}</h3>
                <p><strong>Kelas:</strong> ${visitor.kelas || '-'}</p>
                <p><strong>Aktivitas:</strong> ${visitor.aktivitas || '-'}</p>
                <p><strong>Buku:</strong> ${visitor.judul_buku || '-'}</p>
                <p><strong>Status:</strong> ${visitor.status || '-'}</p>
                <p><strong>QR:</strong> ${visitor.qr_buku || '-'}</p>
                <p><strong>Waktu:</strong> ${waktu}</p>
            </div>
        `;
    });
    
    visitorDataDiv.innerHTML = html;
}

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', function() {
    if (html5QrCode && scanning) {
        stopScanner();
    }
});
