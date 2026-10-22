'use client';
/* eslint-disable @next/next/no-img-element -- Government source images require direct URLs and graceful per-image error fallbacks. */

import { useState } from 'react';
import { ArrowUpRight, FileImage, Leaf, Package, ScanLine } from 'lucide-react';
import type { Photo, Product } from './catalog-types';
import { safeHttpsUrl } from './filter-utils';

export const formatNumber = (value?: number) => typeof value === 'number' ? value.toLocaleString('zh-TW') : '—';
export const formatDate = (value?: string) => {
  if (!value) return '來源未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei' });
};
export function photoKindLabel(kind: string) { return ({ front: '商品正面', back: '商品背面', side: '商品側面', ingredients: '原料標籤' } as Record<string, string>)[kind] || kind || '來源圖片'; }
export function hasIngredientPhoto(product: Product) { return product.photos?.some(photo => /成分|原料|ingredient/i.test(photo.kind)); }
export function statusLabel(product: Product) {
  if (!product.ingredientText?.trim()) return hasIngredientPhoto(product) ? '成分待辨識' : '無成分文字';
  return product.ingredientStatus === 'needs_review' ? '解析待確認' : '有成分文字';
}

export function ProductPhoto({ photos, name, label = false }: { photos: Photo[]; name: string; label?: boolean }) {
  const candidates = (photos || []).map(photo => ({ ...photo, safeUrl: safeHttpsUrl(photo.httpsUrl) || safeHttpsUrl(photo.url) })).filter(photo => photo.safeUrl);
  const [failed, setFailed] = useState<string[]>([]);
  const photo = candidates.find(item => !failed.includes(item.safeUrl!));
  return <div className={`product-photo ${photo ? 'has-photo' : 'no-photo'}`}>
    {photo ? <img src={photo.safeUrl || undefined} alt={`${name}・${photoKindLabel(photo.kind)}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(current => [...current, photo.safeUrl!])} /> : <div className="photo-placeholder"><div className="placeholder-orbit"><Package size={31} strokeWidth={1.2} /><Leaf size={17} strokeWidth={1.4} /></div><span>商品圖片暫不可用</span></div>}
    {label && photo && <span className="photo-caption"><FileImage size={12} />{photoKindLabel(photo.kind)}</span>}
  </div>;
}

export function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return <article className="product-card">
    <button className="product-image-button" onClick={onOpen} aria-label={`查看${product.name}詳細資料`}>
      <ProductPhoto photos={product.photos} name={product.name} />
      <span className={`product-status ${product.ingredientText?.trim() ? '' : 'status-muted'}`}><span />{statusLabel(product)}</span>
      <span className="image-open"><ArrowUpRight size={18} /></span>
    </button>
    <div className="product-card-content">
      <div className="product-category">{product.productCategory || '未分類食品'}</div>
      <h3><button type="button" className="product-name-button" aria-haspopup="dialog" aria-label={`查看${product.name || '未提供商品名稱'}的所有成分與說明`} onClick={onOpen}>{product.name || '未提供商品名稱'}</button></h3>
      <p className="product-company" title={product.company}>{product.company || '來源未提供業者名稱'}</p>
      <div className="product-spec">{product.spec || '未提供規格'}</div>
      <button className="product-detail-link" onClick={onOpen}><span><ScanLine size={15} />查看成分與說明</span><ArrowUpRight size={16} /></button>
    </div>
  </article>;
}
