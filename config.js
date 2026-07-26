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
  API_URL: 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_ANDA',

  // Nama yang tampil di header (opsional, sekadar sapaan)
  MANAGER_NAME: 'Manager'
};
