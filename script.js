// Debugging - Log semua proses
console.log('🚀 Script dimuat...');

// Variabel Global
let html5QrCode;
let scanning = false;
let supabaseUrl, supabaseKey;

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Loaded');
    
    // Dapatkan environment variables dari Netlify
    supabaseUrl = import.meta.env ? import.meta.env.VITE_SUPABASE_URL : null;
    supabaseKey = import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : null;
    
    console.log('🔐 Supabase Config:', {
        url: supabaseUrl ? '✓ Ada' : '✗ Tidak ada',
        key: supabaseKey ? '✓ Ada' : '✗ Tidak ada'
    });
    
    // Muat data pengunjung
    loadVisitorData();
    
    // Setup form submit listener
    const form = document.getElementById('visitorForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Form listener ditambahkan');
    } else {
        console.error('❌ Form tidak ditemukan');
    }
});

// Navigation Function
function showSection(section) {
    console.log('🧭 Navigasi ke section:', section);
    
    // Sembunyikan semua section
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Tampilkan section yang dipilih
    if (section === 'scanner') {
        document.getElementById('scanner-section').classList.add('active');
    } else if (section === 'visitor') {
        document.getElementById('visitor-section').classList.add('active');
        loadVisitorData(); // Refresh data saat buka halaman
    }
}

// Scanner Function - FIXED
function initScanner() {
    console.log('📷 Mencoba inisialisasi scanner...');
    
    const qrReader = document.getElementById('qr-reader');
    const scanButton = document.getElementById('scanButton');
    const resultBox = document.getElementById('qr-result');
    
    if (!qrReader) {
        console.error('❌ QR Reader element tidak ditemukan');
        alert('Error: Element scanner tidak ditemukan');
        return;
    }
    
    if (scanning) {
        // Stop scanner
        console.log('⏹️ Menghentikan scanner...');
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                scanning = false;
                if (scanButton) scanButton.textContent = "Mulai Scan";
                if (resultBox) resultBox.textContent = "Arahkan kamera ke QR Code buku";
                console.log('✅ Scanner dihentikan');
            }).catch(err => {
                console.error('❌ Error stopping scanner:', err);
            });
        }
        return;
    }
    
    // Mulai scanner
    try {
        html5QrCode = new Html5Qrcode("qr-reader");
        console.log('✅ Html5Qrcode instance dibuat');
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        };
        
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                // QR Code terdeteksi
                console.log('✅ QR Code terdeteksi:', decodedText);
                
                if (resultBox) {
                    resultBox.textContent = `✅ QR Terdeteksi: ${decodedText}`;
                    resultBox.classList.add('success');
                }
                
                // Isi field QR di form
                const qrInput = document.getElementById('qr_buku');
                if (qrInput) {
                    qrInput.value = decodedText;
                }
                
                // Stop scanner otomatis
                setTimeout(() => {
                    if (html5QrCode && scanning) {
                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();
                            scanning = false;
                            if (scanButton) scanButton.textContent = "Mulai Scan";
                            console.log('✅ Scanner dihentikan setelah scan');
                        }).catch(err => {
                            console.error('❌ Error stopping scanner:', err);
                        });
                    }
                }, 1000);
            },
            (errorMessage) => {
                // Error scanning (normal, tidak perlu ditampilkan)
                // console.log('🔍 Scanning...', errorMessage);
            }
        ).then(() => {
            scanning = true;
            if (scanButton) scanButton.textContent = "Stop Scan";
            if (resultBox) {
                resultBox.textContent = "🔍 Sedang mencari QR Code...";
                resultBox.classList.remove('success');
            }
            console.log('✅ Scanner berhasil dimulai');
        }).catch(err => {
            console.error('❌ Gagal memulai scanner:', err);
            alert("❌ Gagal mengakses kamera. Pastikan:\n1. Izin kamera sudah diberikan\n2. Kamera HP berfungsi\n3. Gunakan browser Chrome");
            
            if (resultBox) {
                resultBox.textContent = "❌ Gagal mengakses kamera";
                resultBox.classList.remove('success');
            }
        });
        
    } catch (error) {
        console.error('❌ Error creating Html5Qrcode:', error);
        alert("❌ Error sistem scanner: " + error.message);
    }
}

// Form Submit Handler - FIXED
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('📥 Form submit dimulai...');
    
    // Ambil data dari form
    const formData = {
        nama: document.getElementById('nama')?.value.trim(),
        kelas: document.getElementById('kelas')?.value.trim(),
        aktivitas: document.getElementById('aktivitas')?.value,
        judul_buku: document.getElementById('judul_buku')?.value.trim(),
        status: document.getElementById('status')?.value,
        qr_buku: document.getElementById('qr_buku')?.value.trim(),
        created_at: new Date().toISOString()
    };
    
    console.log('📝 Data form:', formData);
    
    // Validasi form
    const requiredFields = ['nama', 'kelas', 'aktivitas', 'judul_buku', 'status'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
        const fieldNames = {
            nama: 'Nama Lengkap',
            kelas: 'Kelas',
            aktivitas: 'Aktivitas',
            judul_buku: 'Judul Buku',
            status: 'Status Buku'
        };
        
        const missingNames = missingFields.map(field => fieldNames[field]);
        alert(`⚠️ Mohon lengkapi field berikut:\n- ${missingNames.join('\n- ')}`);
        console.log('❌ Validasi gagal:', missingFields);
        return;
    }
    
    // Disable tombol submit sementara
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton) {
        const originalText = submitButton.textContent;
        submitButton.textContent = "💾 Menyimpan...";
        submitButton.disabled = true;
    }
    
    try {
        let savedToDatabase = false;
        
        // Simpan ke Supabase jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            console.log('☁️ Mencoba menyimpan ke Supabase...');
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
                        nama: formData.nama,
                        kelas: formData.kelas,
                        aktivitas: formData.aktivitas,
                        judul_buku: formData.judul_buku,
                        status: formData.status,
                        qr_buku: formData.qr_buku || null
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Data tersimpan ke Supabase');
                    savedToDatabase = true;
                    alert('✅ Data berhasil disimpan ke database!');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Gagal menyimpan ke Supabase:', response.status, errorText);
                }
            } catch (dbError) {
                console.error('❌ Database connection error:', dbError);
            }
        } else {
            console.log('⚠️ Supabase credentials tidak tersedia, menggunakan localStorage');
        }
        
        // Simpan ke localStorage sebagai backup
        saveToLocal(formData);
        
        // Reset form
        e.target.reset();
        
        // Refresh data pengunjung
        await loadVisitorData();
        
        // Jika tidak tersimpan ke database tapi seharusnya bisa
        if (!savedToDatabase && (supabaseUrl && supabaseKey)) {
            alert('💾 Data disimpan secara lokal. Koneksi database tidak tersedia.');
        }
        
    } catch (error) {
        console.error('❌ Error saving data:', error);
        alert('❌ Terjadi kesalahan: ' + error.message);
        
        // Simpan ke lokal sebagai fallback
        saveToLocal(formData);
        await loadVisitorData();
        
    } finally {
        // Enable kembali tombol submit
        if (submitButton) {
            submitButton.textContent = "💾 Simpan Data Pengunjung";
            submitButton.disabled = false;
        }
    }
}

// Simpan ke localStorage - FIXED
function saveToLocal(data) {
    try {
        console.log('💾 Menyimpan ke localStorage...');
        let visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
        visitors.unshift(data); // Tambah di awal
        
        // Batasi 50 data terakhir
        if (visitors.length > 50) {
            visitors = visitors.slice(0, 50);
        }
        
        localStorage.setItem('visitors', JSON.stringify(visitors));
        console.log('✅ Data tersimpan ke localStorage (' + visitors.length + ' items)');
    } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
    }
}

// Muat dan tampilkan data pengunjung - FIXED
async function loadVisitorData() {
    console.log('📊 Memuat data pengunjung...');
    
    const visitorDataDiv = document.getElementById('visitorData');
    if (!visitorDataDiv) {
        console.error('❌ Visitor data div tidak ditemukan');
        return;
    }
    
    visitorDataDiv.innerHTML = '<div style="text-align:center;padding:2rem;"><p>🔄 Memuat data pengunjung...</p></div>';
    
    try {
        let visitors = [];
        
        // Coba load dari Supabase dulu jika credentials tersedia
        if (supabaseUrl && supabaseKey) {
            console.log('☁️ Mengambil data dari Supabase...');
            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/pengunjung?order=created_at.desc&limit=20`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                if (response.ok) {
                    visitors = await response.json();
                    console.log('✅ Data dari Supabase:', visitors.length, 'item');
                } else {
                    console.error('❌ Gagal mengambil data dari Supabase:', response.status);
                }
            } catch (dbError) {
                console.error('❌ Database fetch error:', dbError);
            }
        }
        
        // Jika tidak ada data dari database, gunakan localStorage
        if (visitors.length === 0) {
            console.log('💾 Menggunakan data dari localStorage');
            try {
                visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
                console.log('✅ Data dari localStorage:', visitors.length, 'item');
            } catch (localError) {
                console.error('❌ Error parsing localStorage:', localError);
                visitors = [];
            }
        }
        
        displayVisitors(visitors);
        
    } catch (error) {
        console.error('❌ Error loading visitor data:', error);
        
        // Fallback ke localStorage
        try {
            const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
            displayVisitors(localData);
        } catch (localError) {
            console.error('❌ Error loading local data:', localError);
            displayVisitors([]);
        }
    }
}

// Tampilkan data pengunjung - FIXED
function displayVisitors(data) {
    console.log('📋 Menampilkan data pengunjung:', data.length, 'item');
    
    const visitorDataDiv = document.getElementById('visitorData');
    if (!visitorDataDiv) return;
    
    if (!data || data.length === 0) {
        visitorDataDiv.innerHTML = `
            <div style="text-align:center; padding:2rem; background:rgba(255,255,255,0.1); border-radius:10px; margin:1rem 0;">
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
                console.error('📅 Date parsing error:', dateError);
            }
        }
        
        html += `
            <div class="visitor-item" style="animation-delay: ${index * 0.1}s;">
                <h3>${visitor.nama || 'Tidak ada nama'}</h3>
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
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .visitor-item {
                background: rgba(255, 255, 255, 0.1);
                padding: 1rem;
                border-radius: 10px;
                margin-bottom: 0.8rem;
                backdrop-filter: blur(5px);
                border-left: 4px solid #00ccff;
                animation: fadeInUp 0.5s ease forwards;
                opacity: 0;
            }
        `;
        document.head.appendChild(style);
    }
}

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', function() {
    console.log('🧹 Cleaning up...');
    if (html5QrCode && scanning) {
        html5QrCode.stop().catch(err => {
            console.error('❌ Error stopping scanner on unload:', err);
        });
    }
});

// Debug: Tambahkan event listener untuk semua tombol
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
        console.log('🖱️ Button clicked:', e.target.textContent);
    }
});

console.log('🎉 Script inisialisasi selesai');
