import { utils, write } from 'xlsx';

export function spreadsheetFixture(bookType) {
  const book = utils.book_new();
  const first = utils.aoa_to_sheet([
    ['测试表头', null, '日期', '已有计算结果'],
    ['中文单元格', 1234.5, new Date(Date.UTC(2025, 5, 18)), { t: 'n', v: 2469, f: 'B2*2' }],
  ], { dateNF: 'yyyy-mm-dd' });
  first.B2.z = '#,##0.00';
  first.D2.z = '#,##0.00';
  first['!merges'] = [utils.decode_range('A1:B1')];
  utils.sheet_add_aoa(first, [['次页行']], { origin: 'A51' });
  utils.book_append_sheet(book, first, '数据');
  utils.book_append_sheet(book, utils.aoa_to_sheet([['第二张工作表']]), '汇总');
  return Buffer.from(write(book, { type: 'buffer', bookType, compression: true }));
}
