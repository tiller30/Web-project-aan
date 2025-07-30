// Import Supabase (akan di-load dari CDN)
let supabase;

// Inisialisasi Supabase
function initSupabase() {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'your-anon-key';
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = {
            from: (table) => ({
                insert: (data) => fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(data)
                }),
                select: () => fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc&limit=20`, {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                })
            })
        };
    }
}

// Variabel Global
let html5QrCode;
let scanning = false;

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
        // Simpan ke Supabase
        if (supabase) {
            const response = await supabase.from('pengunjung').insert(visitorData);
            if (response.ok) {
                alert('Data berhasil disimpan ke database!');
            } else {
                throw new Error('Gagal menyimpan ke database');
            }
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
        // Coba load dari Supabase dulu
        if (supabase) {
            const response = await supabase.from('pengunjung').select();
            if (response.ok) {
                const data = await response.json();
                displayVisitors(data);
                return;
            }
        }
        
        // Jika gagal, load dari localStorage
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        displayVisitors(localData);
        
    } catch (error) {
        console.error('Error loading data:', error);
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
                <h3>${visitor.nama}</h3>
                <p><strong>Kelas:</strong> ${visitor.kelas}</p>
                <p><strong>Aktivitas:</strong> ${visitor.aktivitas}</p>
                <p><strong>Buku:</strong> ${visitor.judul_buku}</p>
                <p><strong>Status:</strong> ${visitor.status}</p>
                <p><strong>QR:</strong> ${visitor.qr_buku || '-'}</p>
                <p><strong>Waktu:</strong> ${waktu}</p>
            </div>
        `;
    });
    
    visitorDataDiv.innerHTML = html;
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
    loadVisitorData();
});

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', function() {
    if (html5QrCode && scanning) {
        stopScanner();
    }
});