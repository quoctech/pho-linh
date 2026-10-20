// Đường dẫn icon skill tách khỏi element-skill-assets (module đó import Phaser) để các
// trang Angular như màn Thông số dùng được mà không kéo Phaser vào bundle.
const ICON_ROOT = 'assets/hud-icons-v2/skill-icons/icons_webp';
const ICON_FILES: Readonly<Record<string, string>> = {
  kim_van_kiem_quy_tong: '01_kim_van_kiem_quy_tong.webp', kim_kim_quang_pha_giap: '02_kim_kim_quang_pha_giap.webp', kim_cuu_thien_loi_kiem: '03_kim_cuu_thien_loi_kiem.webp',
  moc_thanh_dang_troi_hon: '04_moc_thanh_dang_troi_hon.webp', moc_van_diep_doc_chu: '05_moc_van_diep_doc_chu.webp',
  thuy_han_trieu_pha_khong: '06_thuy_han_trieu_pha_khong.webp', thuy_bang_phong_thien_ly: '07_thuy_bang_phong_thien_ly.webp',
  hoa_hoa_vu_lien_chau: '08_hoa_hoa_vu_lien_chau.webp', hoa_phan_thien_xa_nhat: '09_hoa_phan_thien_xa_nhat.webp',
  tho_son_nhac_tran_dia: '10_tho_son_nhac_tran_dia.webp', tho_huyen_nham_ho_the: '11_tho_huyen_nham_ho_the.webp',
};
export function skillIconPath(iconId: string): string | undefined {
  const file = ICON_FILES[iconId];
  return file ? `${ICON_ROOT}/${file}` : undefined;
}
