# SVS Manager Dashboard

Dashboard Manager untuk Sales Visit System (SVS): HTML5 + CSS3 + Vanilla JavaScript,
tanpa framework, **desktop-first** (didesain untuk laptop, bukan HP — beda dari
app Sales yang mobile-first).

## Hubungan dengan App Sales

Dashboard ini adalah **project/repository terpisah** dari app Sales, tapi
**memakai backend Google Apps Script yang SAMA**. Tidak ada Spreadsheet atau
Apps Script kedua — keduanya membaca/menulis ke sumber data yang sama, hanya
cara akses dan tampilannya berbeda:

- **App Sales** → mobile, per-sales, input data (kunjungan, aktivitas, foto)
- **Manager Dashboard** → desktop, lintas-tim, murni membaca & meringkas data

## Struktur File

| File | Peran |
|---|---|
| `index.html` | Struktur halaman — 4 tab (Overview, Project Explorer, Performa Sales, Log Aktivitas) |
| `style.css` | Design token & layout — konsisten secara visual dengan app Sales (warna, glow border), tapi layout untuk layar lebar |
| `config.js` | URL Web App Apps Script (SAMA dengan app Sales) |
| `script.js` | Seluruh logika: API, render KPI/grafik/widget, export, tab switching |

## Sebelum Dipakai — WAJIB Diisi

1. **`config.js`** — ganti `API_URL` dengan URL Web App Apps Script yang
   **sama persis** dengan yang dipakai app Sales (lihat Deploy → Manage
   deployments di Apps Script Editor).
2. **Logo** — upload `logo.png` (sama dengan yang dipakai app Sales) ke folder
   `assets/icons/logo.png`. Kalau belum diupload, logo di header otomatis
   disembunyikan (tidak akan muncul ikon "gambar rusak").

## Status Halaman

| Halaman | Status |
|---|---|
| **Overview** | ✅ Selesai — KPI, 5 grafik (funnel, status pie, tren, ranking sales, alasan lost), 3 widget list, filter, export |
| **Project Explorer** | 🚧 Placeholder — segera dibangun |
| **Performa Sales** | 🚧 Placeholder — segera dibangun |
| **Log Aktivitas** | 🚧 Placeholder — segera dibangun |

## Fitur di Halaman Overview

- **5 KPI Card**: Total Project, Nilai Pipeline Aktif, Nilai Deal Won, Win Rate, Total Aktivitas
- **Filter global**: rentang tanggal, sales, pipeline stage — mempengaruhi seluruh angka & grafik di halaman
- **5 Grafik** (Chart.js, dimuat dari CDN): Funnel Pipeline, Status Project (pie), Tren Aktivitas (toggle Harian/Mingguan/Bulanan — masing-masing menarik 30 hari/6 bulan/6 bulan terakhir), Ranking Sales, Alasan Lost (pie)
- **3 Widget List**: Project Perlu Perhatian (stale), Follow Up Hari Ini, Aktivitas Terbaru
- **Export Excel** (SheetJS, dari CDN) — 3 sheet: Ringkasan, Ranking Sales, Aktivitas Terbaru
- **Print PDF** — lewat print browser dengan CSS cetak khusus (elemen non-print seperti tab & filter otomatis disembunyikan saat dicetak)
- **Dark/Light mode** — toggle switch, konsisten dengan app Sales

## Catatan Teknis

- **Tidak pakai PWA/offline support** — sengaja, karena dashboard ini didesain
  dipakai di kantor dengan koneksi internet stabil, beda dari app Sales yang
  harus tetap jalan di lokasi proyek dengan sinyal lemah.
- **Chart.js & SheetJS dimuat dari CDN**, bukan di-self-host seperti font di
  app Sales — karena asumsi konteks pemakaian (laptop kantor) tidak butuh
  keandalan offline sekencang app lapangan.
- **Tanpa login** (sesuai keputusan awal) — siapa pun yang tahu link ini bisa
  melihat seluruh data bisnis tim (termasuk nilai project). Pastikan link
  tidak disebar ke luar pihak yang berwenang.
- Backend endpoint baru yang dipakai khusus dashboard ini: `readManagerOverview`,
  `readTrendData`, `readSalesPerformance`, `readActivityLog`, `readSalesList`
  (semuanya di file `ManagerService.gs` pada project Apps Script yang sama
  dengan app Sales).
