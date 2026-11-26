export function productWindow(page: number, pageSize: number, bundleCount: number) {
  const start = (page - 1) * pageSize;
  const productStart = Math.max(0, start - bundleCount);
  const productEnd = Math.max(0, start + pageSize - bundleCount);
  const firstPage = Math.floor(productStart / pageSize) + 1;
  const lastPage = Math.ceil(productEnd / pageSize);
  return { start, productStart, productEnd,
    pageNumbers: productEnd > productStart ? Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index) : [] };
}
