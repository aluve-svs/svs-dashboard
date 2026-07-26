/**
 * ============================================================
 * CONFIG.JS — Manager Dashboard
 * ============================================================
 * Sejak audit keamanan, backend sekarang WAJIB validasi identitas
 * di SETIAP request (termasuk yang cuma baca data) — jadi Manager
 * Dashboard ini butuh identitasnya sendiri, didaftarkan sebagai
 * baris tersendiri di sheet Sales_Master (boleh diberi Sales_Code
 * semacam "MGR-01" dengan Config_Token sendiri).
 * ============================================================
 */
const MGR_CONFIG = {
  // URL Web App hasil Deploy dari Apps Script — SAMA PERSIS dengan
  // yang dipakai app Sales (backend-nya memang satu, dipakai bersama).
  API_URL: 'https://script.google.com/macros/s/AKfycbznquzDsslQsfk-p1AxHmvwer0PL98tmn-WQdN9roQWmObLLLeGm1eNC-Cuckdmok5m1g/exec',

  // Nama yang tampil di header (opsional, sekadar sapaan)
  MANAGER_NAME: 'Manager',

  // Identitas Manager sendiri — WAJIB didaftarkan dulu sebagai baris baru
  // di sheet Sales_Master (Status harus "Aktif"), supaya backend mengenali
  // dan mengizinkan Manager Dashboard mengakses data.
  MANAGER_CODE: 'MGR-01',
  MANAGER_TOKEN: 'aluve-0186'
};
