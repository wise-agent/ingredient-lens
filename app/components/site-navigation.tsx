/* eslint-disable @next/next/no-html-link-for-pages -- Native document navigation is intentional: these routes must work independently of the SPA router. */
import { ArrowUpRight, Leaf } from 'lucide-react';

/** Native anchors keep primary navigation available without a client router. */
export function SiteHeader({ page }: { page: 'home' | 'additives' }) {
  return <header className={`site-header${page === 'additives' ? ' additive-site-header' : ''}`}>
    <div className="header-inner">
      <a className="brand" href="/" aria-label="成分透鏡首頁"><span className="brand-mark"><Leaf size={22} strokeWidth={1.5} /><span /></span><span>成分透鏡<span className="brand-english">INGREDIENT LENS</span></span></a>
      <nav aria-label="主選單">
        <a href="/" className={page === 'home' ? 'nav-main nav-active' : 'nav-main'} aria-current={page === 'home' ? 'page' : undefined}>首頁・商品</a>
        <a href="/additives" className={page === 'additives' ? 'nav-main nav-active' : 'nav-main'} aria-current={page === 'additives' ? 'page' : undefined}>添加物百科</a>
        <a className="nav-data-notes" href={page === 'home' ? '#data-notes' : '#additive-data-notes'}>資料說明<ArrowUpRight size={13} /></a>
      </nav>
      <div className="header-note"><span />讓每個選擇，更清楚</div>
    </div>
  </header>;
}
