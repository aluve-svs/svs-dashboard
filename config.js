/**
 * ============================================================
 * CONFIG.JS — Manager Dashboard
 * ============================================================
 * Beda dari config.js di app Sales: dashboard ini tidak terikat ke
 * satu sales tertentu (Manager melihat data SELURUH tim), jadi tidak
 * ada SALES_CODE/TOKEN individual di sini — cukup alamat backend.
 * ============================================================
 */
const MGR_CONFIG = {
  // URL Web App hasil Deploy dari Apps Script — SAMA PERSIS dengan
  // yang dipakai app Sales (backend-nya memang satu, dipakai bersama).
  API_URL: 'https://script.google.com/macros/library/d/1PVcmFw0Rjn3Fs4Dbi8XoMRZwRVxjo3uHBHQV8N8wFAyz3d8c3bSgvDzf/11',

  // Nama yang tampil di header (opsional, sekadar sapaan)
  MANAGER_NAME: 'Manager'
};
