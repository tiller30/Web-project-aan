// Variabel Global
let html5QrCode;
let scanning = false;
let supabaseUrl, supabaseKey;

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Dapatkan environment variables dari Netlify
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
    
    console.log('Supabase Config:', {
        url: supabaseUrl ? '✓ Tersedia' : '✗ Tidak ditemukan',
        key: supabaseKey ? '✓ Tersedia' : '✗ Tidak ditemukan'
    });
    
    // Muat data pengunjung
    loadVisitorData();
});

// Navigation Function
function showSection(section) {
    // Sembunyikan semua section
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Tampilkan section yang dipilih
    if (section === 'scanner') {
        document.getElementById('scanner-section').classList.add('active');
    } else if (section === 'visitor') {
        document.getElementById('visitor-section').classList.add('active');
    }
}

// Scanner Function - DIPERBAIKI
function initScanner() {
    const qrReader = document.getElementById('qr-reader');
    
    if (scanning) {
        // Stop scanner jika sudah berjalan
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                scanning = false;
                document.querySelector('button[onclick="initScanner()"]').textContent = "Mulai Scan";
            }).catch(err => {
                console.error("Error stopping scanner:", err);
            });
        }
        return;
    }
    
    // Mulai scanner
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
            // QR Code terdeteksi
            document.getElementById('qr-result').innerHTML = `✅ QR Terdeteksi: ${decodedText}`;
            document.getElementById('qr_buku').value = decodedText;
            
            // Stop scanner setelah berhasil scan
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                scanning = false;
                document.querySelector('button[onclick="initScanner()"]').textContent = "Mulai Scan";
            }).catch(err => {
                console.error("Error stopping scanner:", err);
            });
        },
        (errorMessage) => {
            // Error scanning (biasanya QR tidak terdeteksi)
            // Tidak perlu tampilkan error karena ini normal
        }
    ).then(() => {
        scanning = true;
        document.querySelector('button[onclick="initScanner()"]').textContent = "Stop Scan";
        console.log("Scanner started successfully");
    }).catch(err => {
        console.error("Unable to start scanner:", err);
        alert("Gagal mengakses kamera. Pastikan izin kamera diberikan dan kamera tersedia.");
    });
}

// Visitor Form Handling - DIPERBAIKI
document.getElementById('visitorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Ambil data dari form
    const visitorData = {
        nama: document.getElementById('nama').value.trim(),
        kelas: document.getElementById('kelas').value.trim(),
        aktivitas: document.getElementById('aktivitas').value,
        judul_buku: document.getElementById('judul_buku').value.trim(),
        status: document.getElementById('status').value,
        qr_buku: document.getElementById('qr_buku').value.trim(),
        created_at: new Date().toISOString()
    };
    
    // Validasi form
    if (!visitorData.nama || !visitorData.kelas || !visitorData.aktivitas || 
        !visitorData.judul_buku || !visitorData.status) {
        alert('Mohon lengkapi semua field yang wajib diisi!');
        return;
    }
    
    console.log('Menyimpan data:', visitorData);
    
    try {
        let savedToDatabase = false;
        
        // Simpan ke Supabase jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/pengunjung`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        nama: visitorData.nama,
                        kelas: visitorData.kelas,
                        aktivitas: visitorData.aktivitas,
                        judul_buku: visitorData.judul_buku,
                        status: visitorData.status,
                        qr_buku: visitorData.qr_buku
                    })
                });
                
                if (response.ok) {
                    console.log('Data tersimpan ke Supabase');
                    savedToDatabase = true;
                    alert('Data berhasil disimpan ke database!');
                } else {
                    console.error('Gagal menyimpan ke Supabase:', response.status);
                }
            } catch (dbError) {
                console.error('Database error:', dbError);
            }
        }
        
        // Simpan ke localStorage sebagai backup
        saveToLocal(visitorData);
        
        // Reset form
        this.reset();
        
        // Refresh data pengunjung
        loadVisitorData();
        
        // Jika tidak tersimpan ke database, beri tahu user
        if (!savedToDatabase && (supabaseUrl && supabaseKey)) {
            alert('Data disimpan secara lokal. Koneksi database tidak tersedia.');
        }
        
    } catch (error) {
        console.error('Error saving data:', error);
        // Simpan ke lokal sebagai fallback
        saveToLocal(visitorData);
        alert('Data disimpan secara lokal karena ada masalah koneksi.');
        loadVisitorData();
    }
});

// Simpan ke localStorage
function saveToLocal(data) {
    try {
        let visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
        visitors.unshift(data); // Tambah di awal
        // Batasi 50 data terakhir
        if (visitors.length > 50) {
            visitors = visitors.slice(0, 50);
        }
        localStorage.setItem('visitors', JSON.stringify(visitors));
        console.log('Data tersimpan ke localStorage');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Muat dan tampilkan data pengunjung - DIPERBAIKI
async function loadVisitorData() {
    const visitorDataDiv = document.getElementById('visitorData');
    
    if (!visitorDataDiv) {
        console.error('Visitor data div not found');
        return;
    }
    
    visitorDataDiv.innerHTML = '<p style="text-align:center;">Memuat data pengunjung...</p>';
    
    try {
        let visitors = [];
        
        // Coba load dari Supabase dulu jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            try {
                console.log('Mengambil data dari Supabase...');
                const response = await fetch(`${supabaseUrl}/rest/v1/pengunjung?order=created_at.desc&limit=20`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                if (response.ok) {
                    visitors = await response.json();
                    console.log('Data dari Supabase:', visitors.length, 'item');
                } else {
                    console.error('Gagal mengambil data dari Supabase:', response.status);
                }
            } catch (dbError) {
                console.error('Database fetch error:', dbError);
            }
        }
        
        // Jika tidak ada data dari database, gunakan localStorage
        if (visitors.length === 0) {
            console.log('Menggunakan data dari localStorage');
            visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
        }
        
        displayVisitors(visitors);
        
    } catch (error) {
        console.error('Error loading visitor data:', error);
        // Fallback ke localStorage
        try {
            const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
            displayVisitors(localData);
        } catch (localError) {
            console.error('Error loading local data:', localError);
            displayVisitors([]);
        }
    }
}

// Tampilkan data pengunjung - DIPERBAIKI
function displayVisitors(data) {
    const visitorDataDiv = document.getElementById('visitorData');
    
    if (!visitorDataDiv) return;
    
    if (!data || data.length === 0) {
        visitorDataDiv.innerHTML = `
            <div style="text-align:center; padding:2rem; background:rgba(255,255,255,0.1); border-radius:10px;">
                <h3>📭 Tidak ada data pengunjung</h3>
                <p>Data pengunjung akan muncul di sini setelah form diisi</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    data.slice(0, 15).forEach((visitor, index) => {
        // Parse tanggal dengan aman
        let waktuTampil = 'Baru saja';
        if (visitor.created_at) {
            try {
                const date = new Date(visitor.created_at);
                if (!isNaN(date.getTime())) {
                    waktuTampil = date.toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (dateError) {
                console.error('Date parsing error:', dateError);
            }
        }
        
        html += `
            <div class="visitor-item" style="animation: fadeIn 0.3s ease ${index * 0.1}s both;">
                <h3 style="color:#00ccff; margin-bottom:0.5rem;">${visitor.nama || 'Tidak ada nama'}</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.9rem;">
                    <p><strong>📚 Kelas:</strong> ${visitor.kelas || '-'}</p>
                    <p><strong>⚡ Aktivitas:</strong> ${visitor.aktivitas || '-'}</p>
                    <p><strong>📖 Buku:</strong> ${visitor.judul_buku || '-'}</p>
                    <p><strong>📊 Status:</strong> ${visitor.status || '-'}</p>
                    <p style="grid-column:span 2;"><strong>🎫 QR:</strong> ${visitor.qr_buku || '-'}</p>
                    <p style="grid-column:span 2; opacity:0.8; font-size:0.8rem;"><strong>⏰ Waktu:</strong> ${waktuTampil}</p>
                </div>
            </div>
        `;
    });
    
    visitorDataDiv.innerHTML = html;
    
    // Tambahkan animasi CSS jika belum ada
    if (!document.querySelector('#visitor-styles')) {
        const style = document.createElement('style');
        style.id = 'visitor-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .visitor-item {
                background: rgba(255, 255, 255, 0.1);
                padding: 1rem;
                border-radius: 10px;
                margin-bottom: 0.8rem;
                backdrop-filter: blur(5px);
                border-left: 3px solid #00ccff;
            }
        `;
        document.head.appendChild(style);
    }
}

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', function() {
    if (html5QrCode && scanning) {
        html5QrCode.stop().catch(console.error);
    }
});

// Tambahkan event listener untuk tombol scanner
document.addEventListener('click', function(e) {
    if (e.target.matches('button[onclick="initScanner()"]')) {
        initScanner();
    }
});
