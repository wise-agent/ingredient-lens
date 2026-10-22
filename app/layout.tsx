import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '成分透鏡｜食品探索與添加物用途百科',
  description: '用公開食品資料探索商品、依成分設定包含與排除條件，並查閱食品添加物的分類一般用途、別名、原始來源與資料範圍。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant-TW"><body>{children}</body></html>;
}
